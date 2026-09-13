import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

/**
 * Validates and sanitizes req.body / req.params / req.query against a zod schema.
 * On success, replaces the target with the parsed (and coerced/trimmed) data,
 * so downstream handlers only ever see clean, validated input.
 */
export function validate(schema: ZodTypeAny, target: "body" | "params" | "query" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid input.",
        details: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      });
      return;
    }
    (req as any)[target] = result.data;
    next();
  };
}
