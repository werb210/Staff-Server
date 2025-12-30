import express from "express";
import http from "http";

const app = express();

/**
 * ============================================================
 * HARD GUARANTEED FAST HEALTH ENDPOINTS
 * MUST BE FIRST — NO MIDDLEWARE BEFORE THESE
 * ============================================================
 */

// Root (Azure + curl sanity)
app.get("/", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

// Simple public health
app.get("/health", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

// Azure Health Check (configured path)
app.get("/api/_int/health", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

/**
 * ============================================================
 * EVERYTHING BELOW CAN FAIL — HEALTH WILL STILL PASS
 * ============================================================
 */

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Example placeholder for future routes
// app.use("/api", apiRouter);

const PORT = Number(process.env.PORT) || 8080;

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
  console.log("BOOTSTRAP COMPLETE");
});
