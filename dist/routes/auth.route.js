"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
function signToken(userId) {
  return jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });
}
async function findUserByEmail(email) {
  var _a;
  try {
    const result = await db_1.pool.query(
      `
        SELECT id, email, password_hash, google_id, name, created_at, updated_at
        FROM users
        WHERE email = $1
      `,
      [email]
    );
    return (_a = result.rows[0]) !== null && _a !== void 0 ? _a : null;
  } catch (err) {
    console.error("FIND_USER_BY_EMAIL_ERROR", err);
    throw err;
  }
}
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }
    const hash = await bcrypt_1.default.hash(password, 10);
    const insert = await db_1.pool
      .query(
        `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING id, email, password_hash, google_id, name, created_at, updated_at
    `,
        [email, hash, name !== null && name !== void 0 ? name : ""]
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
    const { email, password } = req.body;
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
    const ok = await bcrypt_1.default.compare(password, user.password_hash);
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
exports.default = router;
//# sourceMappingURL=auth.route.js.map
