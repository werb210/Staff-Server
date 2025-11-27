// server/src/utils/validate.ts
import { ZodSchema } from "zod";

export function validate(schema: ZodSchema) {
  return (req: any, res: any, next: any) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        ok: false,
        error: parsed.error.flatten(),
      });
    }
    next();
  };
}
