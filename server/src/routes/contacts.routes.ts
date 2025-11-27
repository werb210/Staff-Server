// server/src/routes/contacts.routes.ts
import { Router } from "express";
import { contactsController } from "../controllers/contactsController.js";

const router = Router();

router.get("/", contactsController.list);
router.get("/:id", contactsController.get);
router.post("/", contactsController.create);
router.put("/:id", contactsController.update);
router.delete("/:id", contactsController.remove);

export default router;
