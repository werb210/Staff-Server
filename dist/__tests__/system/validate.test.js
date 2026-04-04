"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validate_1 = require("../../system/validate");
describe("system/validate", () => {
    it("throws INVALID_* with status 400 for invalid required strings", () => {
        const assertInvalid = (value) => {
            try {
                (0, validate_1.requireString)(value, "EMAIL");
                throw new Error("expected throw");
            }
            catch (err) {
                expect(err).toBeInstanceOf(Error);
                expect(err.message).toBe("INVALID_EMAIL");
                expect(err.status).toBe(400);
            }
        };
        assertInvalid(undefined);
        assertInvalid(null);
        assertInvalid(42);
        assertInvalid("   ");
    });
    it("returns trimmed value for valid required strings", () => {
        expect((0, validate_1.requireString)("  hello@example.com  ", "EMAIL")).toBe("hello@example.com");
    });
    it("returns undefined for non-string optional values and trims strings", () => {
        expect((0, validate_1.optionalString)(undefined)).toBeUndefined();
        expect((0, validate_1.optionalString)(123)).toBeUndefined();
        expect((0, validate_1.optionalString)("  hi  ")).toBe("hi");
    });
});
