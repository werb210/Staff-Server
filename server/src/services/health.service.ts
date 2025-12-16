import { authConfig, config } from "../config/config";

export interface HealthResponse {
  status: "ok" | "fail";
  issues?: string[];
}

export function authHealthCheck(): HealthResponse {
  const issues: string[] = [];

  if (!authConfig.ACCESS_TOKEN_SECRET) issues.push("ACCESS_TOKEN_SECRET missing");
  if (!authConfig.REFRESH_TOKEN_SECRET) issues.push("REFRESH_TOKEN_SECRET missing");
  if (!config.JWT_SECRET) issues.push("JWT_SECRET missing");

  if (!config.TWILIO_ACCOUNT_SID) issues.push("TWILIO_ACCOUNT_SID missing");
  if (!config.TWILIO_AUTH_TOKEN) issues.push("TWILIO_AUTH_TOKEN missing");
  if (!config.TWILIO_VERIFY_SERVICE_SID) issues.push("TWILIO_VERIFY_SERVICE_SID missing");

  return issues.length === 0
    ? { status: "ok" }
    : {
        status: "fail",
        issues,
      };
}
