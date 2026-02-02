"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../prisma");
const config_1 = require("../config");
const shared_1 = require("@brillar/shared");
const validate_1 = require("../middleware/validate");
exports.authRouter = (0, express_1.Router)();
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, config_1.config.jwtSecret, { expiresIn: "15m" });
}
function signRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, config_1.config.jwtRefreshSecret, { expiresIn: "7d" });
}
exports.authRouter.post("/register", (0, validate_1.validate)(shared_1.RegisterSchema), async (req, res) => {
    const { email, password, name } = req.body;
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ message: "Email already in use" });
    }
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
        data: { email, name, passwordHash }
    });
    const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        email: user.email
    });
    const refreshToken = signRefreshToken({ sub: user.id });
    await prisma_1.prisma.refreshToken.create({
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
exports.authRouter.post("/login", (0, validate_1.validate)(shared_1.LoginSchema), async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const valid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!valid) {
        return res.status(401).json({ message: "Invalid credentials" });
    }
    const accessToken = signAccessToken({
        sub: user.id,
        role: user.role,
        email: user.email
    });
    const refreshToken = signRefreshToken({ sub: user.id });
    await prisma_1.prisma.refreshToken.create({
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
exports.authRouter.post("/refresh", async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (!refreshToken) {
        return res.status(400).json({ message: "Missing refresh token" });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwtRefreshSecret);
        const stored = await prisma_1.prisma.refreshToken.findUnique({
            where: { token: refreshToken }
        });
        if (!stored) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        const user = await prisma_1.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user) {
            return res.status(401).json({ message: "Invalid refresh token" });
        }
        const accessToken = signAccessToken({
            sub: user.id,
            role: user.role,
            email: user.email
        });
        res.json({ accessToken });
    }
    catch (error) {
        return res.status(401).json({ message: "Invalid refresh token" });
    }
});
exports.authRouter.post("/logout", async (req, res) => {
    const refreshToken = req.body.refreshToken;
    if (refreshToken) {
        await prisma_1.prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    res.status(204).send();
});
