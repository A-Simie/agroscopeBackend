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
    try {
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

router.get("/profile", async (req, res) => {
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

router.patch("/profile", generalLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const { name, email } = req.body as { name?: string; email?: string };

    if (!name && !email) {
      return res.status(400).json({ error: "Provide name or email to update" });
    }

    const updates: string[] = [];
    const values: string[] = [];
    let paramIndex = 1;

    if (name?.trim()) {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (email) {
      if (!validateEmail(email)) {
        return res.status(400).json({ error: "Invalid email format" });
      }

      const existingEmail = await pool.query(
        "SELECT id FROM users WHERE email = $1 AND id != $2",
        [email.toLowerCase(), decoded.userId]
      );

      if (existingEmail.rows.length > 0) {
        return res.status(409).json({ error: "Email already in use" });
      }

      updates.push(`email = $${paramIndex}`);
      values.push(email.toLowerCase());
      paramIndex++;
    }

    updates.push(`updated_at = now()`);
    values.push(decoded.userId);

    const result = await pool.query<DbUser>(
      `UPDATE users 
       SET ${updates.join(", ")} 
       WHERE id = $${paramIndex} 
       RETURNING id, email, name, google_id, created_at, updated_at`,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error("UPDATE_PROFILE_ERROR", err);
    return res.status(500).json({ error: "Failed to update profile" });
  }
});

router.patch("/password", authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Current and new password required" });
    }

    if (!validatePassword(newPassword)) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters" });
    }

    const userResult = await pool.query<DbUser>(
      "SELECT * FROM users WHERE id = $1",
      [decoded.userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.password_hash) {
      return res.status(400).json({
        error:
          "Cannot change password for Google accounts. Use 'Set Password' instead.",
      });
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );

    if (!validPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const isSamePassword = await bcrypt.compare(
      newPassword,
      user.password_hash
    );

    if (isSamePassword) {
      return res.status(400).json({
        error: "New password cannot be the same as your current password",
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);

    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [newHash, decoded.userId]
    );

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("CHANGE_PASSWORD_ERROR", err);

    if (err instanceof Error) {
      if (err.name === "JsonWebTokenError") {
        return res
          .status(401)
          .json({ error: "Invalid token. Please login again." });
      }
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ error: "Session expired. Please login again." });
      }
    }

    return res.status(500).json({ error: "Failed to change password" });
  }
});

router.post("/password/set", authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const { password } = req.body as { password?: string };

    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    if (!validatePassword(password)) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }

    const userResult = await pool.query<DbUser>(
      "SELECT * FROM users WHERE id = $1",
      [decoded.userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.password_hash) {
      return res.status(400).json({
        error: "You already have a password. Use 'Change Password' instead.",
      });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.query(
      "UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2",
      [hash, decoded.userId]
    );

    return res.json({
      message:
        "Password set successfully. You can now login with email and password.",
    });
  } catch (err) {
    console.error("SET_PASSWORD_ERROR", err);
    return res.status(500).json({ error: "Failed to set password" });
  }
});

router.delete("/account", authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const { password } = req.body as { password?: string };

    const userResult = await pool.query<DbUser>(
      "SELECT * FROM users WHERE id = $1",
      [decoded.userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.password_hash && !password) {
      return res
        .status(400)
        .json({ error: "Password required to delete account" });
    }

    if (user.password_hash && password) {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: "Incorrect password" });
      }
    }

    await pool.query("DELETE FROM users WHERE id = $1", [decoded.userId]);

    return res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("DELETE_ACCOUNT_ERROR", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

router.post("/logout", (_req, res) => {
  res.json({ message: "Logged out successfully" });
});

export default router;
