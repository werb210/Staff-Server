import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

import authRouter from "./modules/auth/auth.routes";
import usersRouter from "./modules/users/users.routes";

const app = express();

/* middleware */
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: true,
    credentials: true
  })
);

/* root */
app.get("/", (_req, res) => {
  res.json({ status: "ok", service: "staff-server" });
});

/* health */
app.get("/health", (_req, res) => {
  res.send("ok");
});

app.get("/api/_int/health", (_req, res) => {
  res.send("ok");
});

/* =========================
   MODULE ROUTES (THE FIX)
   ========================= */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

/* =========================
   DEBUG: LIVE ROUTE DUMP
   ========================= */
app.get("/__debug/routes", (_req, res) => {
  const routes: any[] = [];
  app._router.stack.forEach((layer: any) => {
    if (layer.route) {
      routes.push({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods)
      });
    } else if (layer.name === "router" && layer.handle?.stack) {
      layer.handle.stack.forEach((r: any) => {
        if (r.route) {
          routes.push({
            path: r.route.path,
            methods: Object.keys(r.route.methods)
          });
        }
      });
    }
  });
  res.json({ count: routes.length, routes });
});

/* listen */
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
