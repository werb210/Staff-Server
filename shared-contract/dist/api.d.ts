import { z } from "zod";
export declare const ApiSuccessSchema: z.ZodObject<{
    status: z.ZodLiteral<"ok">;
    data: z.ZodAny;
    rid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ApiErrorSchema: z.ZodObject<{
    status: z.ZodLiteral<"error">;
    error: z.ZodString;
    rid: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const ApiResponseSchema: z.ZodUnion<readonly [typeof ApiSuccessSchema, typeof ApiErrorSchema]>;
export type ApiResponse<T> = {
    status: "ok";
    data: T;
    rid?: string;
} | {
    status: "error";
    error: string;
    rid?: string;
};
