import { buildApp, initializeServer, registerApiRoutes } from "../app";
import { runMigrations } from "../migrations";
import { logError } from "../observability/logger";

const app = buildApp();

/* =========================
   START SERVER
========================= */
if (process.env.PORT === undefined) {
  throw new Error("PORT env var missing");
}
const port = Number(process.env.PORT);
if (Number.isNaN(port)) {
  throw new Error("PORT env var missing");
}

let server: ReturnType<typeof app.listen>;

async function bootstrap(): Promise<void> {
  try {
    await runMigrations();
  } catch (err) {
    logError("migrations_failed_nonfatal", { err });
  }

  /* =========================
     API ROUTES — FIRST
  ========================= */
  registerApiRoutes(app);

  server = app.listen(port, "0.0.0.0", () => {
    if (typeof app.set === "function") {
      const address = typeof server.address === "function" ? server.address() : null;
      if (address && typeof address === "object" && "port" in address) {
        app.set("port", address.port);
      } else {
        app.set("port", port);
      }
    }
    console.log(`API server listening on ${port}`);
  });

  if (typeof app.set === "function") {
    app.set("server", server);
  }

  if (typeof initializeServer === "function") {
    initializeServer().catch((err) => {
      logError("server_initialize_failed", { err });
    });
  }
}

bootstrap().catch((err) => {
  logError("server_bootstrap_failed", { err });
});

export { server };
