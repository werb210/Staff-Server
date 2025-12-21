import { Router } from "express";
const router = Router();
router.get("/build", (_req, res) => {
    res.status(200).json({
        status: "ok",
        node: process.version,
        env: process.env.NODE_ENV ?? "unknown",
    });
});
export default router;
