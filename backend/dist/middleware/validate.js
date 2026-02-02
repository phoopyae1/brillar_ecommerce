"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema) {
    return (req, _res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const error = new Error("Validation error");
            error.status = 400;
            error.details = result.error.flatten();
            throw error;
        }
        req.body = result.data;
        next();
    };
}
