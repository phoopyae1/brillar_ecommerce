import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.string().default("4000"),
  DATABASE_URL: z.string().url(),
  MONGODB_URI: z.string().url().optional(),
  JWT_SECRET: z.string().min(10),
  JWT_REFRESH_SECRET: z.string().min(10),
  CORS_ORIGIN: z.string().default("http://localhost:3000")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration", parsed.error.format());
  throw new Error("Invalid environment configuration");
}

export const config = {
  env: parsed.data.NODE_ENV,
  port: Number(parsed.data.PORT),
  databaseUrl: parsed.data.DATABASE_URL,
  mongodbUri: parsed.data.MONGODB_URI || "mongodb://localhost:27017/brillarecommerce",
  jwtSecret: parsed.data.JWT_SECRET,
  jwtRefreshSecret: parsed.data.JWT_REFRESH_SECRET,
  corsOrigin: parsed.data.CORS_ORIGIN
};
