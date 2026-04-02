"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const app_1 = require("./app");
const env_1 = require("./config/env");
exports.app = (0, app_1.createApp)();
if (require.main === module) {
    const { PORT } = (0, env_1.getEnv)();
    exports.app.listen(Number(PORT || 8080), () => {
        console.log(`Server running on ${PORT || 8080}`);
    });
}
exports.default = exports.app;
