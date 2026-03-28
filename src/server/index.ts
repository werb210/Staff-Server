import { createServer } from "./createServer";
import { bootstrap } from "../startup/bootstrap";

export async function startServer() {
  await bootstrap();
  return createServer();
}

async function start() {
  await startServer();
}

if (require.main === module) {
  start().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
