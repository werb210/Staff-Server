import express from "express";
import cors from "cors";

import authRoutes from "./auth/auth.routes";
import internalRoutes from "./routes/internal.routes";

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://api.staff.boreal.financial",
    ],
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/_int", internalRoutes);

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`Staff-Server listening on port ${PORT}`);
});
