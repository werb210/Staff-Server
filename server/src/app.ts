import express from "express";

import { registerRoutes } from "./routes";

const app = express();

app.use(express.json());

registerRoutes(app);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error", err);
  res.status(500).json({ error: "Internal Server Error" });
});

export { app };
export default app;
