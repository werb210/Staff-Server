import { buildApp } from "./app";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

buildApp().then((app) => {
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`Server running on port ${port}`);
  });

  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });
});
