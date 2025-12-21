import { Router } from "express";
import { listRegisteredRoutes } from "./listRoutes";
const router = Router();
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
router.get("/routes", (req, res) => {
    const routes = listRegisteredRoutes(req.app, "");
    res.status(200).json({ status: "ok", routes });
});
export default router;
