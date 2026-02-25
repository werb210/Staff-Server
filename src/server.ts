import { buildApp } from "./app";

export const app = buildApp();

if (process.env.NODE_ENV !== "test") {
  const port = Number(process.env.PORT ?? 3000);
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`server_listening:${port}`);
  });

  process.on("SIGTERM", () => server.close());
  process.on("SIGINT", () => server.close());
}
