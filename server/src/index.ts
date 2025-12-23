import express from "express";
import cors from "cors";
import http from "http";
import { intRouter } from "./routes/_int.js";

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// INTERNAL ROUTES — MUST BE MOUNTED FIRST
app.use("/_int", intRouter);

// ROOT (OPTIONAL BUT EXPLICIT)
app.get("/", (_req, res) => {
  res.status(200).send("Staff-Server running");
});

const port = Number(process.env.PORT) || 8080;
const server = http.createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${port}`);
});
