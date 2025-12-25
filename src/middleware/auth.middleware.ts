import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: { id: string };
}

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const cookieToken = req.cookies?.authToken;

  const token =
    cookieToken ||
    (authHeader?.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : null);

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = { id: decoded.userId };
    next();
  } catch (err) {
    const error = err as Error;

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
