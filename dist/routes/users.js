"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_routes_1 = __importDefault(require("../modules/users/users.routes"));
const auth_1 = require("../middleware/auth");
const capabilities_1 = require("../auth/capabilities");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
router.use((0, auth_1.requireCapability)([capabilities_1.CAPABILITIES.USER_MANAGE]));
router.use("/", users_routes_1.default);
exports.default = router;
