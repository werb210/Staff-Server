"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applications_routes_1 = __importDefault(require("./applications.routes"));
const documents_1 = __importDefault(require("./documents"));
const users_1 = __importDefault(require("./users"));
const router = (0, express_1.Router)();
router.use("/applications", applications_routes_1.default);
router.use("/documents", documents_1.default);
router.use("/users", users_1.default);
router.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
});
exports.default = router;
