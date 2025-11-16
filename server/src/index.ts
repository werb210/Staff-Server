// server/src/index.ts
import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT ? Number(process.env.PORT) : 5000;

app.listen(PORT, () => {
  console.log(`🚀 Staff API running on port ${PORT}`);
});
