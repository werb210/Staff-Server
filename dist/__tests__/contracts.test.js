"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = require("../app");
const endpoints_1 = require("../contracts/endpoints");
(0, vitest_1.describe)("contracts", () => {
    (0, vitest_1.it)("all endpoints exist", async () => {
        const contractEndpoints = Object.values(endpoints_1.endpoints);
        for (const endpoint of contractEndpoints) {
            const response = await (0, supertest_1.default)(app_1.app).post(endpoint).send({});
            (0, vitest_1.expect)(response.status).not.toBe(404);
        }
    });
});
