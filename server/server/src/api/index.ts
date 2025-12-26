import { Router } from "express";

const router = Router();

router.use("/_int", (req, res, next) => {
  void import("./_int/index.js")
    .then((module) => module.default(req, res, next))
    .catch(next);
});
router.use("/auth", (req, res, next) => {
  void import("./auth/auth.routes.js")
    .then((module) => module.default(req, res, next))
    .catch(next);
});
router.use("/crm", (req, res, next) => {
  void import("./crm/index.js")
    .then((module) => module.default(req, res, next))
    .catch(next);
});
router.use("/users", (req, res, next) => {
  void import("./users/index.js")
    .then((module) => module.default(req, res, next))
    .catch(next);
});

export default router;
