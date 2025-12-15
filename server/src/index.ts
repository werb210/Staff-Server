import express from "express";
import cors from "cors";
import healthRoutes from "./routes/health";
import authRoutes from "./routes/auth";

const app = express();

// ----- middleware
app.use(express.json({ limit: "5mb" }));

// CORS: allow your staff portal + local dev.
// If you already have stricter CORS logic elsewhere, keep it—just ensure staff.boreal.financial is allowed.
app.use(
  cors({
    origin: (origin, cb) => {
      const allowed = new Set([
        "https://staff.boreal.financial",
        "http://localhost:5173",
        "http://localhost:3000",
      ]);
      // allow non-browser clients (curl/postman) with no origin
      if (!origin) return cb(null, true);
      if (allowed.has(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// ----- routes
app.use(healthRoutes);
app.use(authRoutes);

// Root: optional
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// ----- 404
app.use((_req, res) => {
  res.status(404).send("Not Found");
});

// ----- start
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
