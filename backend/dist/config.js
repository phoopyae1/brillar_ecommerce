"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const zod_1 = require("zod");
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.string().default("development"),
    PORT: zod_1.z.string().default("4000"),
    DATABASE_URL: zod_1.z.string().url(),
    MONGODB_URI: zod_1.z.string().url().optional(),
    JWT_SECRET: zod_1.z.string().min(10),
    JWT_REFRESH_SECRET: zod_1.z.string().min(10),
    CORS_ORIGIN: zod_1.z.string().default("http://localhost:3000")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment configuration", parsed.error.format());
    throw new Error("Invalid environment configuration");
}
exports.config = {
    env: parsed.data.NODE_ENV,
    port: Number(parsed.data.PORT),
    databaseUrl: parsed.data.DATABASE_URL,
    mongodbUri: parsed.data.MONGODB_URI || "mongodb://localhost:27017/brillarecommerce",
    jwtSecret: parsed.data.JWT_SECRET,
    jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
    corsOrigin: parsed.data.CORS_ORIGIN
};
