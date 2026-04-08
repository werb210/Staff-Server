import { createApp } from "./app";
import { initDb } from "./db/init";

const PORT = process.env.PORT || 8080;

export async function buildApp() {
  return createApp();
}

if (typeof buildApp !== "function") {
  throw new Error("buildApp export broken");
}

if (require.main === module) {
  void (async () => {
    try {
      await initDb();
    } catch (err) {
      console.error("DB INIT FAILED:", err);
    }
    const app = await buildApp();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })();
}
