import { Router } from "express";
import contactsController from "../controllers/contactsController.js";

const router = Router();

// Only list + create exist
router.get("/", contactsController.list);
router.post("/", contactsController.create);

export default router;
