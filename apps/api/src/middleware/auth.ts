import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";

export type TokenPayload = {
  sub: string;
  role: string;
  email: string;
};

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing auth token" });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role as any, email: payload.email };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as TokenPayload;
    req.user = { id: payload.sub, role: payload.role as any, email: payload.email };
  } catch (error) {
    // ignore invalid token for optional auth
  }
  return next();
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden" });
    }
    return next();
  };
}
