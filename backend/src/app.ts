import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { config } from "./config";
import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { inventoryRouter } from "./routes/inventory";
import { cartRouter } from "./routes/cart";
import { ordersRouter } from "./routes/orders";
import { adminRouter } from "./routes/admin";
import { uploadRouter } from "./routes/upload";
import { integrationRouter } from "./routes/integration";
import { errorHandler } from "./middleware/error-handler";

export const app = express();

// Configure helmet to allow images
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http:", "blob:"],
    },
  },
}));
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan("combined"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
  })
);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Brillar E-commerce API",
      version: "0.1.0"
    }
  },
  apis: ["./src/routes/*.ts"]
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve uploaded files statically - must be before API routes
app.use("/uploads", express.static(path.join(process.cwd(), "uploads"), {
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

app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/integration", integrationRouter);

app.use(errorHandler);
