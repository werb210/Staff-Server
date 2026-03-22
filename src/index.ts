import express from "express";
import { registerRoutes } from "./routeRegistry";
import { requestContextMiddleware } from "./middleware/requestContext";
import { corsMiddleware } from "./middleware/cors";
import { notFound } from "./middleware/notFound";
import { errorHandler } from "./middleware/errorHandler";
import { validateStartup } from "./startup/validateStartup";

const app = express();

// ===============================
// STARTUP VALIDATION
// ===============================
validateStartup();

// ===============================
// MIDDLEWARE ORDER (CRITICAL)
// ===============================
app.use(requestContextMiddleware);
app.use(express.json());
app.use(corsMiddleware);

// ===============================
// HEALTH
// ===============================
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// ===============================
// ROUTES
// ===============================
registerRoutes(app);

// ===============================
// NOT FOUND
// ===============================
app.use(notFound);

// ===============================
// ERROR HANDLER (LAST)
// ===============================
app.use(errorHandler);

// ===============================
// START
// ===============================
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`SERVER RUNNING ON ${PORT}`);
});

// UNHANDLED_REJECTION_HANDLER
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});
