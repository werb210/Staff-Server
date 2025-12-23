import express from "express";
import cors from "cors";

// NOTE: NodeNext + ESM REQUIRES .js EXTENSIONS
import { registerInternalRoutes } from "./routes/_int.js";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Internal routes
registerInternalRoutes(app);

// Root guard (prevents Azure health probes from erroring)
app.get("/", (_req, res) => {
  res.status(200).send("OK");
});

// Port (Azure injects PORT)
const PORT = process.env.PORT ? Number(process.env.PORT) : 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Staff-Server running on port ${PORT}`);
});
