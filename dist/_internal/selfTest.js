"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSelfTest = runSelfTest;
const http_1 = __importDefault(require("http"));
function request(port, test) {
    return new Promise((resolve) => {
        const data = test.body ? JSON.stringify(test.body) : null;
        const req = http_1.default.request({
            hostname: "localhost",
            port,
            path: test.path,
            method: test.method,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": data ? Buffer.byteLength(data) : 0,
            },
        }, (res) => {
            resolve(res.statusCode !== undefined && res.statusCode < 500);
        });
        req.on("error", () => resolve(false));
        if (data)
            req.write(data);
        req.end();
    });
}
async function runSelfTest(port) {
    const tests = [
        { name: "health", method: "GET", path: "/health" },
        { name: "otp-start", method: "POST", path: "/auth/otp/start", body: { phone: "123" } },
        { name: "otp-verify", method: "POST", path: "/auth/otp/verify", body: { code: "123456" } },
    ];
    console.log("Running startup self-test...");
    for (const t of tests) {
        const ok = await request(port, t);
        if (!ok) {
            console.error(`SELF-TEST FAILED: ${t.name} (${t.method} ${t.path})`);
            process.exit(1);
        }
        console.log(`PASS: ${t.name}`);
    }
    console.log("SELF-TEST PASSED");
}
