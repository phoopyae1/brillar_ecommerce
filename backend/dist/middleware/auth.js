"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.optionalAuth = optionalAuth;
exports.requireRole = requireRole;
exports.requireAdminOrAgent = requireAdminOrAgent;
exports.tryRefreshToken = tryRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const prisma_1 = require("../prisma");
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({
            message: "Missing authorization header",
            error: "AUTHORIZATION_HEADER_MISSING"
        });
    }
    if (!authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Invalid authorization header format. Expected 'Bearer <token>'",
            error: "INVALID_AUTHORIZATION_FORMAT",
            received: authHeader.substring(0, 20) + "..."
        });
    }
    const token = authHeader.slice(7).trim();
    if (!token) {
        return res.status(401).json({
            message: "Token is empty",
            error: "EMPTY_TOKEN"
        });
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // Validate payload structure
        if (!payload.sub || !payload.role || !payload.email) {
            console.error("Token payload missing required fields:", payload);
            return res.status(401).json({
                message: "Token payload is invalid",
                error: "INVALID_TOKEN_PAYLOAD"
            });
        }
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
        return next();
    }
    catch (error) {
        // Provide more specific error messages
        let errorMessage = "Invalid token";
        let errorCode = "INVALID_TOKEN";
        if (error.name === "TokenExpiredError") {
            errorMessage = "Token has expired. Please log in again or refresh your token.";
            errorCode = "TOKEN_EXPIRED";
        }
        else if (error.name === "JsonWebTokenError") {
            errorMessage = "Token is malformed or invalid.";
            errorCode = "MALFORMED_TOKEN";
        }
        else if (error.name === "NotBeforeError") {
            errorMessage = "Token is not active yet.";
            errorCode = "TOKEN_NOT_ACTIVE";
        }
        console.error("Token verification failed:", {
            error: error.name,
            message: error.message,
            tokenPreview: token.substring(0, 20) + "..."
        });
        return res.status(401).json({
            message: errorMessage,
            error: errorCode,
            details: process.env.NODE_ENV === "development" ? error.message : undefined
        });
    }
}
function optionalAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        return next();
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = { id: payload.sub, role: payload.role, email: payload.email };
    }
    catch (error) {
        // ignore invalid token for optional auth
    }
    return next();
}
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (req.user.role !== role) {
            return res.status(403).json({ message: "Forbidden" });
        }
        return next();
    };
}
function requireAdminOrAgent(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    // Allow ADMIN role (and AGENT if it exists in the future)
    // For now, only ADMIN is supported
    if (req.user.role !== "ADMIN") {
        return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    return next();
}
/**
 * Middleware that attempts to refresh the access token if it's expired
 * Requires a refreshToken in the request body or headers
 */
async function tryRefreshToken(req, res, next) {
    const authHeader = req.headers.authorization;
    // If no auth header, proceed (will fail at authenticate middleware)
    if (!authHeader?.startsWith("Bearer ")) {
        return next();
    }
    const token = authHeader.slice(7).trim();
    try {
        // Try to verify the token
        jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        // Token is valid, proceed
        return next();
    }
    catch (error) {
        // If token is expired, try to refresh it
        if (error.name === "TokenExpiredError") {
            // Check for refresh token in body or header
            const refreshToken = req.body?.refreshToken || req.headers["x-refresh-token"] || req.headers["refresh-token"];
            console.log("Token expired, checking for refresh token:", {
                hasBody: !!req.body,
                bodyKeys: req.body ? Object.keys(req.body) : [],
                hasRefreshTokenInBody: !!req.body?.refreshToken,
                hasRefreshTokenInHeader: !!req.headers["x-refresh-token"] || !!req.headers["refresh-token"]
            });
            if (!refreshToken) {
                // No refresh token provided, return expired error with helpful message
                return res.status(401).json({
                    message: "Token has expired. Please provide a refresh token in the request body as 'refreshToken' or in the header as 'X-Refresh-Token', or log in again to get a new token.",
                    error: "TOKEN_EXPIRED",
                    canRefresh: false,
                    howToRefresh: {
                        method1: "Include 'refreshToken' in request body",
                        method2: "Include 'X-Refresh-Token' header",
                        example: {
                            body: { "refreshToken": "your-refresh-token-here" },
                            header: "X-Refresh-Token: your-refresh-token-here"
                        }
                    }
                });
            }
            try {
                // Verify refresh token
                const refreshPayload = jsonwebtoken_1.default.verify(refreshToken, config_1.config.jwtRefreshSecret);
                // Check if refresh token exists in database
                const stored = await prisma_1.prisma.refreshToken.findUnique({
                    where: { token: refreshToken }
                });
                if (!stored) {
                    return res.status(401).json({
                        message: "Invalid refresh token",
                        error: "INVALID_REFRESH_TOKEN"
                    });
                }
                // Get user to create new access token
                const user = await prisma_1.prisma.user.findUnique({
                    where: { id: refreshPayload.sub },
                    select: { id: true, role: true, email: true }
                });
                if (!user) {
                    return res.status(401).json({
                        message: "User not found",
                        error: "USER_NOT_FOUND"
                    });
                }
                // Generate new access token
                const newAccessToken = jsonwebtoken_1.default.sign({ sub: user.id, role: user.role, email: user.email }, config_1.config.jwtSecret, { expiresIn: "15m" });
                // Set the new token in response header and continue
                res.setHeader("X-New-Access-Token", newAccessToken);
                req.headers.authorization = `Bearer ${newAccessToken}`;
                // Set user in request for downstream middleware
                req.user = { id: user.id, role: user.role, email: user.email };
                console.log(`Token refreshed for user: ${user.email}`);
                return next();
            }
            catch (refreshError) {
                console.error("Token refresh failed:", refreshError);
                return res.status(401).json({
                    message: "Failed to refresh token. Please log in again.",
                    error: "REFRESH_FAILED",
                    details: process.env.NODE_ENV === "development" ? refreshError.message : undefined
                });
            }
        }
        // For other errors, proceed (will be handled by authenticate middleware)
        return next();
    }
}
