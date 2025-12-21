"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApplicationsRouter = createApplicationsRouter;
const express_1 = require("express");
const requireAuth_1 = require("../middleware/requireAuth");
const applications_controller_1 = require("./applications.controller");
function createApplicationsRouter(controller = new applications_controller_1.ApplicationsController()) {
    const router = (0, express_1.Router)();
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
    router.post("/", requireAuth_1.requireAuth, controller.create);
    router.put("/:id", requireAuth_1.requireAuth, controller.update);
    router.patch("/:id/status", requireAuth_1.requireAuth, controller.changeStatus);
    router.patch("/:id/assign", requireAuth_1.requireAuth, controller.assign);
    router.post("/:id/credit-summary/regenerate", requireAuth_1.requireAuth, controller.regenerateCreditSummary);
    router.post("/:id/owners", requireAuth_1.requireAuth, controller.addOwner);
    router.put("/:id/owners/:ownerId", requireAuth_1.requireAuth, controller.updateOwner);
    router.delete("/:id/owners/:ownerId", requireAuth_1.requireAuth, controller.deleteOwner);
    return router;
}
exports.default = createApplicationsRouter();
