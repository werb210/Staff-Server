import express from "express";
import { runQuery } from "./lib/db";
import { CONFIG } from "./system/config";
import { ok } from "./utils/http/respond";

export const app = express();

app.get("/health", (_req, res) => {
  return ok(res, { status: "ok" });
});

const PORT = CONFIG.PORT;

async function startServer() {
  if (CONFIG.NODE_ENV !== "test") {
    try {
      await runQuery("SELECT 1");
    } catch {
      console.error("DB not ready, exiting");
      process.exit(1);
    }
  }

  app.listen(PORT, () => {
    console.log(`Server running on ${PORT}`);
  });
}

if (CONFIG.NODE_ENV !== "test") {
  void startServer();
}
