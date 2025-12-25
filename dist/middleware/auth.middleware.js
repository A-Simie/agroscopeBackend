"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET;
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (
    !(authHeader === null || authHeader === void 0
      ? void 0
      : authHeader.startsWith("Bearer "))
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice("Bearer ".length).trim();
  try {
    const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
    req.user = { id: decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};
exports.authMiddleware = authMiddleware;
//# sourceMappingURL=auth.middleware.js.map
