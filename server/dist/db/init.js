"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
const client_1 = require("./client");
async function initDb() {
    await client_1.client.query("select 1");
}
