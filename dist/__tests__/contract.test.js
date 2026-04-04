"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const contracts_1 = require("../contracts");
test("response contract stays valid", () => {
    const sample = {
        status: "ok",
        data: {},
    };
    expect(contracts_1.ApiResponseSchema.safeParse(sample).success).toBe(true);
});
