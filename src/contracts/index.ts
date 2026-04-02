import { z } from "zod";

export type ApiResponse<T = any> =
  | { status: "ok"; data: T }
  | { status: "error"; error: string };

export type CreateLeadInput = {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
};

export type CreateLeadOutput = {
  id: string;
};

export const ApiResponseSchema = z.union([
  z.object({
    status: z.literal("ok"),
    data: z.unknown(),
  }),
  z.object({
    status: z.literal("error"),
    error: z.string(),
  }),
]);
