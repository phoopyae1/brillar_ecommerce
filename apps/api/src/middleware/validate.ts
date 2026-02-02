import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const error: any = new Error("Validation error");
      error.status = 400;
      error.details = result.error.flatten();
      throw error;
    }
    req.body = result.data;
    next();
  };
}
