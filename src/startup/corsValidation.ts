import { logError } from "../observability/logger";

const requiredCorsHeaders = ["Authorization", "Content-Type", "Idempotency-Key"];

export function getCorsAllowedHeaders(): string[] {
  return ["Authorization", "Content-Type", "X-Request-Id", "Idempotency-Key"];
}

export function validateCorsConfig(): void {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS;
  if (!rawOrigins || rawOrigins.trim().length === 0) {
    logError("cors_validation_failed", {
      reason: "missing_cors_allowed_origins",
    });
    process.exit(1);
  }
  const origins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    logError("cors_validation_failed", {
      reason: "empty_cors_allowed_origins",
    });
    process.exit(1);
  }
  const hasStaffOrigin = origins.some((origin) =>
    origin.includes("staff.boreal.financial")
  );
  if (!hasStaffOrigin) {
    logError("cors_validation_failed", {
      reason: "staff_origin_missing",
      origins,
    });
    process.exit(1);
  }

  const allowedHeaders = getCorsAllowedHeaders();
  const missingHeaders = requiredCorsHeaders.filter(
    (header) =>
      !allowedHeaders.some(
        (allowed) => allowed.toLowerCase() === header.toLowerCase()
      )
  );
  if (missingHeaders.length > 0) {
    logError("cors_validation_failed", {
      reason: "required_headers_missing",
      missingHeaders,
    });
    process.exit(1);
  }
}
