"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_1 = require("./middleware/auth");
const auth_2 = __importDefault(require("./routes/auth"));
const routes_1 = __importDefault(require("./routes"));
const health_1 = __importDefault(require("./routes/health"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: "https://staff.boreal.financial",
    credentials: true,
}));
app.options("*", (0, cors_1.default)({ origin: "https://staff.boreal.financial", credentials: true }));
app.use(express_1.default.json());
// PUBLIC ROUTES (NO AUTH)
app.use("/api/auth", auth_2.default);
app.use("/api", health_1.default);
// AUTH MIDDLEWARE
app.use(auth_1.requireAuth);
// PROTECTED ROUTES
app.use("/api", routes_1.default);
const port = process.env.PORT || 8080;
app.listen(port, () => {
    console.log(`Staff Server running on port ${port}`);
});
