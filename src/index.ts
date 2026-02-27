import buildApp from "./app";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

async function start() {
  const app = await buildApp();

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
}

if (process.env.NODE_ENV !== "test") {
  start();
}
