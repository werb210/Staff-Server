"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const app_1 = require("../app");
function createServer() {
    return (0, app_1.buildAppWithApiRoutes)();
}
exports.default = createServer;
