import express from "express";
import http from "http";

const app = express();

const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

app.get("/health", (_req, res) => {
  res.status(200).send("OK");
});

app.get("/", (_req, res) => {
  res.send("Staff Server Running");
});

const server = http.createServer(app);

server.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on ${HOST}:${PORT}`);
});
