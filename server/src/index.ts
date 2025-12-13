import app from "./app";
import { config } from "./config/config";

function toPort(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

// Azure sets PORT. Your config can still be used locally.
const PORT = toPort(process.env.PORT, toPort(config.PORT, 8080));
// Bind to all interfaces in containers/app service
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
