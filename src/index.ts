import express from "express";
import cors from "cors";
import authRouter from "./routes/auth";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT_EXCEPTION", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED_REJECTION", reason);
});

const app = express();

app.use(cors());
app.use(express.json());

/* ROOT */
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "staff-server",
  });
});

/* HEALTH */
app.get("/health", (_req, res) => res.status(200).send("ok"));
app.get("/api/_int/health", (_req, res) => res.status(200).send("ok"));

/* ROUTES */
app.use("/api/auth", authRouter);

/* ROUTE DUMP — REQUIRED FOR AUDIT */
console.log("=== ROUTES DUMP ===");
(app as any)._router.stack.forEach((layer: any) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
    console.log(`${methods} ${layer.route.path}`);
  }
});
console.log("===================");

/* LISTEN */
const port = Number(process.env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`Server listening on ${port}`);
});
