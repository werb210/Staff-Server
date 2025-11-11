import { ZodSchema } from "zod";

export const parseWithSchema = <T>(schema: ZodSchema<T>, payload: unknown): T => {
  return schema.parse(payload);
};
