import { Router } from "express";
import usersRouter from "./users/index.js";

const api = Router();

api.use("/users", usersRouter);

export default api;
