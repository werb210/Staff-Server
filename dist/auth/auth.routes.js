"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const requireAuth_1 = require("../middleware/requireAuth");
const router = (0, express_1.Router)();
router.post("/login", auth_controller_1.authController.login);
router.get("/me", requireAuth_1.requireAuth, auth_controller_1.me);
exports.default = router;
