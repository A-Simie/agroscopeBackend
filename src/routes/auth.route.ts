import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import passport from "../config/passport";
import { pool } from "../db";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET!;

interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many attempts, please try again later" },
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
});

const signToken = (userId: string): string =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password: string): boolean => password.length >= 8;

router.post("/signup", generalLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const existing = await pool.query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query<DbUser>(
      "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, google_id, created_at, updated_at",
      [email.toLowerCase(), hash, name?.trim() || email.split("@")[0]]
    );

    const user = result.rows[0]!;
    const token = signToken(user.id);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const result = await pool.query<DbUser>(
      "SELECT * FROM users WHERE email = $1",
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.password_hash) {
      return res.status(401).json({
        error: "Please use 'Continue with Google' to sign in",
      });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;

    return res.json({ user: safeUser, token });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["email", "profile"],
    session: false,
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/signup?error=auth_failed`,
  }),
  (req, res) => {
    const user = req.user as DbUser;
    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;

    const userData = encodeURIComponent(JSON.stringify(safeUser));

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`
    );
  }
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/signup?error=auth_failed`,
  }),
  (req, res) => {
    try {
      console.log("User from Google:", req.user);

      const user = req.user as DbUser;

      if (!user) {
        console.error("No user object returned from Passport");
        return res.redirect(`${process.env.FRONTEND_URL}/signup?error=no_user`);
      }

      const token = signToken(user.id);
      const { password_hash, ...safeUser } = user;

      const userData = encodeURIComponent(JSON.stringify(safeUser));

      res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`
      );
    } catch (error) {
      console.error("OAuth callback error:", error);
      res.redirect(`${process.env.FRONTEND_URL}/signup?error=server_error`);
    }
  }
);

router.get("/me", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const result = await pool.query<DbUser>(
      "SELECT id, email, name, google_id, created_at, updated_at FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
