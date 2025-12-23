import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRouter from "./api/auth";
import usersRouter from "./api/users";
import crmRouter from "./api/crm";
import intRouter from "./api/_int";

const app = express();

/* core middleware */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.use(
  cors({
    origin: [
      "https://staff.boreal.financial",
      "https://server.boreal.financial",
    ],
    credentials: true,
  })
);

/* ROUTE MOUNTS — THIS WAS THE BREAK */
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/crm", crmRouter);
app.use("/api/_int", intRouter);

/* hard 404 so Azure doesn’t fake success */
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    path: req.path,
  });
});

const port = Number(process.env.PORT) || 8080;

app.listen(port, () => {
  console.log(`Staff-Server running on port ${port}`);
});
