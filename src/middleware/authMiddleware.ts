import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

export interface AuthRequest extends Request {
  user?: { id: string };
}

export default function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Attach user to request
    req.user = { id: decoded.id };

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}
