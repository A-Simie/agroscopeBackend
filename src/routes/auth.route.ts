import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../db";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

interface DbUser {
  id: string;
  email: string;
  password_hash: string | null;
  google_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

function signToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

async function findUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const result = await pool.query<DbUser>(
      `
        SELECT id, email, password_hash, google_id, name, created_at, updated_at
        FROM users
        WHERE email = $1
      `,
      [email]
    );

    return result.rows[0] ?? null;
  } catch (err) {
    console.error("FIND_USER_BY_EMAIL_ERROR", err);
    throw err;
  }
}

router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 10);

    const insert = await pool
      .query<DbUser>(
        `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash, google_id, name, created_at, updated_at
    `,
        [email, hash, name ?? ""]
      )
      .catch((err) => {
        console.error("USER_INSERT_ERROR", err);
        throw err;
      });

    const user = insert.rows[0];

    if (!user) {
      return res.status(500).json({ error: "Failed to create user" });
    }

    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;

    res.setHeader("Authorization", `Bearer ${token}`);
    return res.status(201).json(safeUser);
  } catch (err) {
    console.error("SIGNUP_ERROR", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(404).json({ error: "Account does not exist" });
    }

    if (!user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, user.password_hash);

    if (!ok) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;

    res.setHeader("Authorization", `Bearer ${token}`);
    return res.json(safeUser);
  } catch (err) {
    console.error("LOGIN_ERROR", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
