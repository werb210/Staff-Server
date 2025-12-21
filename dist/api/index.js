"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = __importDefault(require("./auth/index"));
const internal_routes_1 = __importDefault(require("./internal.routes"));
const public_routes_1 = __importDefault(require("./public.routes"));
const router = (0, express_1.Router)();
router.use("/auth", index_1.default);
router.use("/internal", internal_routes_1.default);
router.use("/public", public_routes_1.default);
exports.default = router;
