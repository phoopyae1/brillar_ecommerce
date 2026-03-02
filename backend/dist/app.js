"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const auth_1 = require("./routes/auth");
const products_1 = require("./routes/products");
const inventory_1 = require("./routes/inventory");
const cart_1 = require("./routes/cart");
const orders_1 = require("./routes/orders");
const admin_1 = require("./routes/admin");
const upload_1 = require("./routes/upload");
const integration_1 = require("./routes/integration");
const adminAgent_1 = require("./routes/adminAgent");
const customerAgent_1 = require("./routes/customerAgent");
const faq_1 = require("./routes/faq");
const error_handler_1 = require("./middleware/error-handler");
exports.app = (0, express_1.default)();
// Configure helmet to allow images
exports.app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
        },
    },
}));
exports.app.use((0, cors_1.default)({ origin: config_1.config.corsOrigin, credentials: true }));
exports.app.use(express_1.default.json());
exports.app.use((0, morgan_1.default)("combined"));
exports.app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased limit for development/production
    message: "Too many requests, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for health checks
        return req.path === "/health";
    }
}));
const swaggerSpec = (0, swagger_jsdoc_1.default)({
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Brillar E-commerce API",
            version: "0.1.0"
        }
    },
    apis: ["./src/routes/*.ts"]
});
exports.app.use("/docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
exports.app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
// Serve uploaded files statically - must be before API routes
exports.app.use("/uploads", express_1.default.static(path_1.default.join(process.cwd(), "uploads"), {
    setHeaders: (res, filePath) => {
        // Set proper headers for images
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg') ||
            filePath.endsWith('.png') || filePath.endsWith('.gif') ||
            filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', `image/${filePath.split('.').pop()}`);
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }
    }
}));
exports.app.use("/api/auth", auth_1.authRouter);
exports.app.use("/api/products", products_1.productsRouter);
exports.app.use("/api/inventory", inventory_1.inventoryRouter);
exports.app.use("/api/cart", cart_1.cartRouter);
exports.app.use("/api/orders", orders_1.ordersRouter);
exports.app.use("/api/admin", admin_1.adminRouter);
exports.app.use("/api/admin-agent", adminAgent_1.adminAgentRouter);
exports.app.use("/api/customer-agent", customerAgent_1.customerAgentRouter);
exports.app.use("/api/faq", faq_1.faqRouter);
exports.app.use("/api/upload", upload_1.uploadRouter);
exports.app.use("/api/integration", integration_1.integrationRouter);
exports.app.use(error_handler_1.errorHandler);
