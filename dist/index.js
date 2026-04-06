"use strict";
console.log("BOOT START");
console.log("PORT ENV:", process.env.PORT);
console.log("NODE ENV:", process.env.NODE_ENV);
process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT:", err);
});
process.on("unhandledRejection", (err) => {
    console.error("REJECTION:", err);
});
console.log("LOADING ENV...");
const { validateRuntimeEnvOrExit } = require("./config/env");
console.log("LOADING APP...");
const loadedApp = require("./app");
const app = loadedApp.default || loadedApp;
const { initDb } = require("./db/init");
const Redis = require("ioredis");
console.log("STARTING SERVER...");
function runStartupSelfTest() {
    try {
        require("./routes");
        require("./routes/auth");
        require("./config/env");
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Startup self-test failed: ${message}`);
    }
}
validateRuntimeEnvOrExit();
runStartupSelfTest();
void (async () => {
    try {
        if (process.env.SKIP_DATABASE === "true") {
            console.log("DB SKIPPED");
        }
        else {
            try {
                await initDb();
                console.log("DB CONNECTED");
            }
            catch (err) {
                console.error("DB FAILED:", err);
            }
        }
        let redis;
        try {
            if (process.env.REDIS_URL) {
                redis = new Redis(process.env.REDIS_URL);
                console.log("REDIS CONNECTING");
            }
            else {
                console.log("REDIS SKIPPED");
            }
        }
        catch (err) {
            console.error("REDIS FAILED:", err);
        }
        void redis;
        const port = process.env.PORT || 3000;
        const startGuard = setTimeout(() => {
            console.error("SERVER DID NOT START — EXITING");
            process.exit(1);
        }, 15000);
        app.listen(port, "0.0.0.0", () => {
            clearTimeout(startGuard);
            console.log(`Server running on port ${port}`);
        });
    }
    catch (err) {
        console.error("FATAL STARTUP ERROR:", err);
        process.exit(1);
    }
})();
