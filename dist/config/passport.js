"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const db_1 = require("../db");
const callbackURL = process.env.NODE_ENV
    ? `${process.env.API_URL}/api/auth/google/callback`
    : "http://localhost:4000/api/auth/google/callback";
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL,
}, async (_accessToken, _refreshToken, profile, done) => {
    var _a, _b;
    try {
        const email = (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value;
        if (!email) {
            return done(new Error("No email provided by Google"));
        }
        const existingUser = await db_1.pool.query("SELECT * FROM users WHERE email = $1", [email.toLowerCase()]);
        if (existingUser.rows.length > 0) {
            const user = existingUser.rows[0];
            if (!user.google_id) {
                const updated = await db_1.pool.query("UPDATE users SET google_id = $1, updated_at = now() WHERE id = $2 RETURNING *", [profile.id, user.id]);
                return done(null, updated.rows[0]);
            }
            return done(null, user);
        }
        const newUser = await db_1.pool.query("INSERT INTO users (email, name, google_id, created_at, updated_at) VALUES ($1, $2, $3, now(), now()) RETURNING *", [
            email.toLowerCase(),
            profile.displayName || email.split("@")[0],
            profile.id,
        ]);
        return done(null, newUser.rows[0]);
    }
    catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error);
    }
}));
exports.default = passport_1.default;
//# sourceMappingURL=passport.js.map