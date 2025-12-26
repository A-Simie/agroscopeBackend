"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = (req, res, next) => {
    var _a;
    const authHeader = req.headers.authorization;
    const cookieToken = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.authToken;
    const token = cookieToken ||
        ((authHeader === null || authHeader === void 0 ? void 0 : authHeader.startsWith("Bearer "))
            ? authHeader.slice("Bearer ".length).trim()
            : null);
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { id: decoded.userId };
        next();
    }
    catch (err) {
        const error = err;
        if (error.name === "TokenExpiredError") {
            res.status(401).json({ error: "Token expired" });
            return;
        }
        if (error.name === "JsonWebTokenError") {
            res.status(401).json({ error: "Invalid token" });
            return;
        }
        res.status(401).json({ error: "Unauthorized" });
    }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.middleware.js.map