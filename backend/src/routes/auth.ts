import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { config } from "../config";
import { LoginSchema, RegisterSchema } from "@brillar/shared";
import { validate } from "../middleware/validate";
import { logoutAtenxionUser } from "../services/atenxion";

export const authRouter = Router();

function signAccessToken(payload: { sub: string; role: string; email: string }) {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "1d" });
}

function signRefreshToken(payload: { sub: string }) {
  return jwt.sign(payload, config.jwtRefreshSecret, { expiresIn: "7d" });
}

authRouter.post("/register", validate(RegisterSchema), async (req, res) => {
  const { email, password, name } = req.body;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash }
  });
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  res.status(201).json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, name: user.name }
  });
});

authRouter.post("/login", validate(LoginSchema), async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    email: user.email
  });
  const refreshToken = signRefreshToken({ sub: user.id });
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  });
  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role, name: user.name }
  });
});

authRouter.post("/refresh", async (req, res) => {
  const refreshToken = req.body.refreshToken as string | undefined;
  if (!refreshToken) {
    return res.status(400).json({ message: "Missing refresh token" });
  }
  try {
    const payload = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
      sub: string;
    };
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken }
    });
    if (!stored) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email
    });
    res.json({ accessToken });
  } catch (error) {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
});

authRouter.post("/logout", async (req, res) => {
  const refreshToken = req.body.refreshToken as string | undefined;
  let userId: string | null = null;

  if (refreshToken) {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      select: { userId: true }
    });
    if (stored) {
      userId = stored.userId;
    }
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  if (userId) {
    logoutAtenxionUser(userId).catch(() => {});
  }

  res.status(204).send();
});
