import { buildApp, initializeServer, registerApiRoutes } from "../app";

const app = buildApp();

/* =========================
   API ROUTES — FIRST
========================= */
registerApiRoutes(app);

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

const server = app.listen(port, "0.0.0.0", () => {
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
    console.error(err);
    process.exit(1);
  });
}

export { server };
