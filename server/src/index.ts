import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * INTERNAL ROUTES
 * These MUST exist at runtime or Azure health checks fail silently.
 */
try {
  const intRoutes = require("./routes/_int");
  app.use("/_int", intRoutes);
} catch (e) {
  console.error("❌ Failed to mount /_int routes", e);
}

/**
 * API ROUTES
 */
try {
  const apiRoutes = require("./routes");
  app.use("/api", apiRoutes);
} catch (e) {
  console.error("❌ Failed to mount /api routes", e);
}

/**
 * ROOT (keeps Express from returning implicit 404)
 */
app.get("/", (_req, res) => {
  res.status(200).send("Staff-Server online");
});

const port = process.env.PORT || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});
