import { createApp } from "./app";
import { ENV } from "./config/env";
import { ensureDb } from "./db";

async function start() {
  await ensureDb();

  const app = createApp();

  app.listen(Number(ENV.PORT), "0.0.0.0", () => {
    console.log(`Running on ${ENV.PORT}`);
  });
}

start();
