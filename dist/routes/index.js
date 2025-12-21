"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoutes = registerRoutes;
const public_1 = __importDefault(require("./public"));
const _int_routes_1 = __importDefault(require("./_int.routes"));
const API_PREFIX = "/api";
function registerRoutes(app) {
    app.use(public_1.default);
    app.use(`${API_PREFIX}/_int`, _int_routes_1.default);
    app.get(`${API_PREFIX}/health`, (_req, res) => {
        res.json({ status: "ok" });
    });
}
