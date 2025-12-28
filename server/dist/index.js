"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.get("/api/_int/health", (_req, res) => res.status(200).send("ok"));
app.get("/api/_int/live", (_req, res) => res.status(200).send("live"));
const port = Number(process.env.PORT);
app.listen(port, () => {
    console.log(`Staff-Server running on port ${port}`);
});
