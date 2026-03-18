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
  const verifyCode = params.code ?? DEFAULT_OTP_CODE;
  let req = request(app).post("/api/auth/login");
  if (params.requestId) {
    req = req.set("x-request-id", params.requestId);
  }
  if (params.idempotencyKey) {
    req = req.set("Idempotency-Key", params.idempotencyKey);
  }
  let res = await req.send({
    phone: params.phone,
    code: verifyCode,
  });

  const code =
    res.body?.error?.code ??
    res.body?.code ??
    (typeof res.body?.error === "string" ? res.body.error : undefined);
  const shouldBootstrapOtp =
    process.env.NODE_ENV === "test" &&
    (code === "invalid_code" || code === "expired_code");

  if (shouldBootstrapOtp) {
    await otpStartRequest(app, {
      phone: params.phone,
      requestId: params.requestId,
      idempotencyKey: params.idempotencyKey ? `${params.idempotencyKey}-start` : undefined,
    });

    let retryReq = request(app).post("/api/auth/login");
    if (params.requestId) {
      retryReq = retryReq.set("x-request-id", params.requestId);
    }
    if (params.idempotencyKey) {
      retryReq = retryReq.set("Idempotency-Key", `${params.idempotencyKey}-retry`);
    }
    res = await retryReq.send({
      phone: params.phone,
      code: verifyCode,
    });
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
