import express from "express";
import { registerRoutes } from "./routes";
import { applyCors } from "./config/cors";
const app = express();
applyCors(app);
app.use(express.json());
registerRoutes(app);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: "Not Found" });
});
// error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = err?.message ?? "Internal Server Error";
    console.error("Unhandled error", err);
    res.status(status).json({ error: message });
});
export { app };
export default app;
