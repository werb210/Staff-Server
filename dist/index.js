"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const db_1 = require("./db");
const deadLetterWorker_1 = require("./workers/deadLetterWorker");
const verifyCheck_1 = require("./startup/verifyCheck");
async function start() {
    await (0, db_1.ensureDb)();
    await (0, verifyCheck_1.verifyTwilioSetup)();
    const app = (0, app_1.createApp)();
    setInterval(() => {
        (0, deadLetterWorker_1.processDeadLetters)().catch((err) => console.error("Dead letter worker failed", err));
    }, 15000);
    app.listen(Number(env_1.ENV.PORT), "0.0.0.0", () => {
        console.log(`Running on ${env_1.ENV.PORT}`);
    });
}
start();
