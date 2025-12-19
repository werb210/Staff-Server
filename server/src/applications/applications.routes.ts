import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { ApplicationsController } from "./applications.controller";

export function createApplicationsRouter(
  controller = new ApplicationsController()
) {
  const router = Router();

  // -----------------------------
  // READ (PIPELINE / CRM VIEWS)
  // -----------------------------
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.get("/:id/timeline", controller.timeline);
  router.get("/:id/context", controller.context);
  router.get("/:id/required-docs", controller.requiredDocs);

  // -----------------------------
  // WRITE / MUTATIONS (AUTH ONLY)
  // -----------------------------
  router.post("/", requireAuth, controller.create);
  router.put("/:id", requireAuth, controller.update);

  router.patch("/:id/status", requireAuth, controller.changeStatus);
  router.patch("/:id/assign", requireAuth, controller.assign);

  router.post(
    "/:id/credit-summary/regenerate",
    requireAuth,
    controller.regenerateCreditSummary
  );

  router.post("/:id/owners", requireAuth, controller.addOwner);
  router.put(
    "/:id/owners/:ownerId",
    requireAuth,
    controller.updateOwner
  );
  router.delete(
    "/:id/owners/:ownerId",
    requireAuth,
    controller.deleteOwner
  );

  return router;
}

export default createApplicationsRouter();
