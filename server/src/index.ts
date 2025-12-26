import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import express, { Request, Response } from "express";

const app = express();
const port = Number(process.env.PORT) || 8080;
const host = "0.0.0.0";

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

app.get("/api/_int/health", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

app.get("/api/_int/live", (_req: Request, res: Response) => {
  res.status(200).send("ok");
});

const isMain =
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  app.listen(port, host, () => {
    console.log(`Staff-Server running on port ${port}`);
  });
}

export default app;
