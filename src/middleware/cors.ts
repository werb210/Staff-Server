import cors from "cors";

const allowedOrigins = [process.env.CLIENT_ORIGIN, process.env.PORTAL_ORIGIN].filter(
  (origin): origin is string => Boolean(origin)
);

export const corsMiddleware = cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
});
