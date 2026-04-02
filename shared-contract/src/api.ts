import { z } from "zod";

export const ApiSuccessSchema = z.object({
  status: z.literal("ok"),
  data: z.any(),
  rid: z.string().optional(),
});

export const ApiErrorSchema = z.object({
  status: z.literal("error"),
  error: z.string(),
  rid: z.string().optional(),
});

export const ApiResponseSchema = z.union([ApiSuccessSchema, ApiErrorSchema]);

export type ApiResponse<T> =
  | { status: "ok"; data: T; rid?: string }
  | { status: "error"; error: string; rid?: string };
