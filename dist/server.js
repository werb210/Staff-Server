"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const lenders_1 = __importDefault(require("./routes/lenders"));
const lenderProducts_1 = __importDefault(require("./routes/lenderProducts"));
const healthRoutes_1 = __importDefault(require("./platform/healthRoutes"));
const readiness_1 = __importDefault(require("./routes/readiness"));
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use("/lenders", lenders_1.default);
app.use("/lenderProducts", lenderProducts_1.default);
app.use("/health", healthRoutes_1.default);
app.use("/readiness", readiness_1.default);
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`SERVER RUNNING ON ${PORT}`);
});
