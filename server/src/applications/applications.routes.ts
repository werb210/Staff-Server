import { Router } from "express";
import { ApplicationsController } from "./applications.controller";

export function createApplicationsRouter(controller = new ApplicationsController()) {
  const router = Router();

  router.get("/", controller.list);
  router.post("/", controller.create);
  router.get("/:id", controller.getById);
  router.put("/:id", controller.update);
  router.patch("/:id/status", controller.changeStatus);
  router.patch("/:id/assign", controller.assign);
  router.get("/:id/timeline", controller.timeline);
  router.get("/:id/required-docs", controller.requiredDocs);
  router.post("/:id/credit-summary/regenerate", controller.regenerateCreditSummary);

  router.post("/:id/owners", controller.addOwner);
  router.put("/:id/owners/:ownerId", controller.updateOwner);
  router.delete("/:id/owners/:ownerId", controller.deleteOwner);

  return router;
}

export default createApplicationsRouter();
