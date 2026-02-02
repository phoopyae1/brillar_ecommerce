import { NextFunction, Request, Response } from "express";

export function errorHandler(
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(error);
  const status = (error as any).status || 500;
  res.status(status).json({
    message: error.message || "Internal Server Error"
  });
}
