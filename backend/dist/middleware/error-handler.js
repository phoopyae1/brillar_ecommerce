"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
function errorHandler(error, _req, res, _next) {
    console.error(error);
    const status = error.status || 500;
    res.status(status).json({
        message: error.message || "Internal Server Error"
    });
}
