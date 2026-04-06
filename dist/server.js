"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const init_1 = require("./db/init");
console.log("PORT ENV:", process.env.PORT ?? "(undefined)");
const port = Number(process.env.PORT ?? 8080);
console.log("PORT BOUND:", port);
void (async () => {
    try {
        await (0, init_1.initDb)();
    }
    catch (err) {
        console.error("DB INIT FAILED:", err);
    }
    const app = (0, app_1.createApp)();
    app.listen(port, "0.0.0.0", () => {
        console.log(`SERVER STARTED ON ${port}`);
    });
})();
