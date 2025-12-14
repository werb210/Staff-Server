import { Router } from "express";
import dbRoutes from "./db";

const r = Router();

r.use("/db", dbRoutes);

export default r;
