import express from "express";
import cors from "cors";
import { registerRoutes } from "./routes";

const app = express();

app.use(
  cors({
    origin: ["https://staff.boreal.financial"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Explicit preflight handling
app.options("*", cors());

app.use(express.json());

// Register ALL API routes
registerRoutes(app);

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
