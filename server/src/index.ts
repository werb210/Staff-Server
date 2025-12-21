import express from "express";
import cors from "cors";
import { requireAuth } from "./middleware/auth";
import authRoutes from "./routes/auth";
import apiRoutes from "./routes";

const app = express();

app.use(
  cors({
    origin: "https://staff.boreal.financial",
    credentials: true,
  }),
);

app.options("*", cors({ origin: "https://staff.boreal.financial", credentials: true }));

app.use(express.json());

// PUBLIC ROUTES (NO AUTH)
app.use("/api/auth", authRoutes);

// AUTH MIDDLEWARE
app.use(requireAuth);

// PROTECTED ROUTES
app.use("/api", apiRoutes);

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Staff Server running on port ${port}`);
});
