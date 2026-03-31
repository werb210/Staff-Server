import "dotenv/config";
import { createServer } from "./server/createServer";
const PORT = Number(process.env.PORT || 8080);
const HOST = "0.0.0.0";

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION", err);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION", err);
});

function boot() {
  const app = createServer();

  app.listen(PORT, HOST, () => {
    console.log(`SERVER RUNNING ON ${PORT}`);
  });
}

try {
  boot();
} catch (err) {
  console.error("[FATAL BOOT ERROR]", err);
  process.exit(1);
}
