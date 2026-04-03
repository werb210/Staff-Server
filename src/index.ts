import cors from "cors";
import express from "express";

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/", (_req, res) => {
  res.status(200).send("SERVER RUNNING");
});

void (async () => {
  try {
    const routes = await import("./routes/index.js");
    if (routes?.default) {
      app.use("/api", routes.default);
    }
    console.log("Routes loaded");
  } catch (err) {
    console.error("Failed to load routes:", err);
  }
})();

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
