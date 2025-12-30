import express from "express";
import apiRouter from "./routes/api";

const app = express();

app.use(express.json());

// root sanity check
app.get("/", (_req, res) => {
  res.send("OK");
});

// API ROUTES — THIS WAS THE MISSING PIECE
app.use("/api", apiRouter);

// optional direct health (keep if you want)
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, () => {
  console.log(`SERVER LISTENING on ${PORT}`);
});
