import { post } from "./http";

export const TEST_PHONE = process.env.TEST_PHONE || "+15878881837";
export const OTP_CODE = process.env.TEST_OTP_CODE || "984842";

export async function startOtp() {
  return post<{ ok: boolean }>("/api/auth/otp/start", {
    phone: TEST_PHONE,
  });
}

export async function verifyOtp() {
  const response = await post<{ accessToken: string; refreshToken: string }>(
    "/api/auth/otp/verify",
    {
      phone: TEST_PHONE,
      code: OTP_CODE,
    }
  );

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
  };
}

export async function refreshToken(refreshTokenValue: string) {
  return post<{ accessToken: string }>("/api/auth/refresh", {
    refreshToken: refreshTokenValue,
  });
}

export function authHeader(token: string) {
  return { Authorization: `Bearer ${token}` };
}
