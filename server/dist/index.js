import express from "express";
const app = express();
const port = Number(process.env.PORT) || 8080;
const host = "0.0.0.0";
process.on("uncaughtException", (err) => {
    console.error("Uncaught exception:", err);
});
process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
});
app.get("/api/_int/health", (_req, res) => {
    res.status(200).send("ok");
});
app.get("/api/_int/live", (_req, res) => {
    res.status(200).send("ok");
});
/**
 * IMPORTANT:
 * Azure App Service does NOT execute Node the same way as local Node.
 * The previous ESM isMain guard prevented app.listen() from running,
 * causing the process to exit immediately and Azure to return 504s.
 *
 * This server MUST always listen.
 */
app.listen(port, host, () => {
    console.log(`Staff-Server running on port ${port}`);
});
export default app;
