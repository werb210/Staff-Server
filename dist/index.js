"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
console.log('BOOT: START');
const app = (0, express_1.default)();
app.get('/health', (_req, res) => {
    res.send('OK');
});
const port = Number(process.env.PORT) || 8080;
app.listen(port, '0.0.0.0', () => {
    console.log('BOOT: LISTENING ON', port);
});
