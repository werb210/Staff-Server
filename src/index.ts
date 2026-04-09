import app from "./app.js";
import { validateEnv } from "./config/env.js";

const PORT = process.env.PORT || 8080;
const LISTEN_PORT = typeof PORT === "string" ? Number.parseInt(PORT, 10) : PORT;

async function start() {
  try {
    // Only validate env — do NOT call external services
    validateEnv();

    app.listen(LISTEN_PORT, "0.0.0.0", () => {
      console.log(`SERVER STARTED ON ${PORT}`);
    });

  } catch (err) {
    console.error("Startup failed:", err);
    process.exit(1);
  }
}

start();
