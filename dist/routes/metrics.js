"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const registry_1 = require("../metrics/registry");
const router = express_1.default.Router();
router.get("/", async (_req, res) => {
    res.set("Content-Type", registry_1.registry.contentType);
    res.end(await registry_1.registry.metrics());
});
exports.default = router;
