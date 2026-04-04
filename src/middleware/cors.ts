import cors from "cors";

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ||
  "https://boreal.financial,https://www.boreal.financial,https://client.boreal.financial,https://staff.boreal.financial,https://server.boreal.financial"
)
  .split(",")
  .map((o) => o.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const isLocalhost =
      process.env.NODE_ENV !== "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin || "");

    if (allowedOrigins.includes(origin) || isLocalhost) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
});
