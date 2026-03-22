"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateStartup = validateStartup;
function validateStartup() {
    var _a, _b;
    (_a = process.env).NODE_ENV || (_a.NODE_ENV = "development");
    if (process.env.NODE_ENV !== "production") {
        (_b = process.env).DATABASE_URL || (_b.DATABASE_URL = "postgres://postgres:postgres@localhost:5432/staff_dev");
        return;
    }
    const required = ["NODE_ENV", "DATABASE_URL"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) {
        console.error("Missing environment variables:", missing.join(", "));
        process.exit(1);
    }
    console.log("Startup validation passed");
}
