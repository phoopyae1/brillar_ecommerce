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
const config_1 = require("./config");
const auth_1 = require("./routes/auth");
const products_1 = require("./routes/products");
const inventory_1 = require("./routes/inventory");
const cart_1 = require("./routes/cart");
const orders_1 = require("./routes/orders");
const admin_1 = require("./routes/admin");
const error_handler_1 = require("./middleware/error-handler");
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({ origin: config_1.config.corsOrigin, credentials: true }));
exports.app.use(express_1.default.json());
exports.app.use((0, morgan_1.default)("combined"));
exports.app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200
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
exports.app.use("/api/auth", auth_1.authRouter);
exports.app.use("/api/products", products_1.productsRouter);
exports.app.use("/api/inventory", inventory_1.inventoryRouter);
exports.app.use("/api/cart", cart_1.cartRouter);
exports.app.use("/api/orders", orders_1.ordersRouter);
exports.app.use("/api/admin", admin_1.adminRouter);
exports.app.use(error_handler_1.errorHandler);
