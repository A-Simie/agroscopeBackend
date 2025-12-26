"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const passport_1 = __importDefault(require("../config/passport"));
const db_1 = require("../db");
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET;
const authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: "Too many attempts, please try again later" },
});
const generalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 20,
});
const signToken = (userId) => jsonwebtoken_1.default.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePassword = (password) => password.length >= 8;
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
        const existing = await db_1.pool.query("SELECT id FROM users WHERE email = $1", [
            email.toLowerCase(),
        ]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: "Email already in use" });
        }
        const hash = await bcrypt_1.default.hash(password, 12);
        const result = await db_1.pool.query("INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name, google_id, created_at, updated_at", [email.toLowerCase(), hash, (name === null || name === void 0 ? void 0 : name.trim()) || email.split("@")[0]]);
        const user = result.rows[0];
        const token = signToken(user.id);
        return res.status(201).json({ user, token });
    }
    catch (err) {
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
        const result = await db_1.pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        const user = result.rows[0];
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        if (!user.password_hash) {
            return res.status(401).json({
                error: "Please use 'Continue with Google' to sign in",
            });
        }
        const valid = await bcrypt_1.default.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = signToken(user.id);
        const { password_hash, ...safeUser } = user;
        return res.json({ user: safeUser, token });
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
router.get("/google", passport_1.default.authenticate("google", {
    scope: ["email", "profile"],
    session: false,
}));
router.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/signup?error=auth_failed`,
}), (req, res) => {
    const user = req.user;
    const token = signToken(user.id);
    const { password_hash, ...safeUser } = user;
    const userData = encodeURIComponent(JSON.stringify(safeUser));
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
});
router.get("/google/callback", passport_1.default.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/signup?error=auth_failed`,
}), (req, res) => {
    try {
        console.log("User from Google:", req.user);
        const user = req.user;
        if (!user) {
            console.error("No user object returned from Passport");
            return res.redirect(`${process.env.FRONTEND_URL}/signup?error=no_user`);
        }
        const token = signToken(user.id);
        const { password_hash, ...safeUser } = user;
        const userData = encodeURIComponent(JSON.stringify(safeUser));
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}&user=${userData}`);
    }
    catch (error) {
        console.error("OAuth callback error:", error);
        res.redirect(`${process.env.FRONTEND_URL}/signup?error=server_error`);
    }
});
router.get("/me", async (req, res) => {
    var _a;
    try {
        const token = (_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({ error: "Not authenticated" });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const result = await db_1.pool.query("SELECT id, email, name, google_id, created_at, updated_at FROM users WHERE id = $1", [decoded.userId]);
        if (!result.rows[0]) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
});
router.post("/logout", (_req, res) => {
    res.json({ message: "Logged out successfully" });
});
exports.default = router;
//# sourceMappingURL=auth.route.js.map