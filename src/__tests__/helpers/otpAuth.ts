import request from "supertest";
import type { Express } from "express";

export const DEFAULT_OTP_CODE = "123456";

export async function otpVerifyRequest(
  app: Express,
  params: {
    phone: string;
    code?: string;
    requestId?: string;
    idempotencyKey?: string;
  }
): Promise<request.Response> {
  let req = request(app).post("/api/auth/otp/verify");
  if (params.requestId) {
    req = req.set("x-request-id", params.requestId);
  }
  if (params.idempotencyKey) {
    req = req.set("Idempotency-Key", params.idempotencyKey);
  }
  const res = await req.send({
    phone: params.phone,
    code: params.code ?? DEFAULT_OTP_CODE,
  });
  if (res.body?.token) {
    res.body.accessToken = res.body.token;
  }
  if (res.body?.user) {
    res.body.user = res.body.user;
  }
  if (res.body?.error?.code && !res.body.code) {
    res.body.code = res.body.error.code;
  }
  return res;
}

export async function otpStartRequest(
  app: Express,
  params: { phone: string; requestId?: string; idempotencyKey?: string }
): Promise<request.Response> {
  let req = request(app).post("/api/auth/otp/start");
  if (params.requestId) {
    req = req.set("x-request-id", params.requestId);
  }
  if (params.idempotencyKey) {
    req = req.set("Idempotency-Key", params.idempotencyKey);
  }
  return req.send({ phone: params.phone });
}
