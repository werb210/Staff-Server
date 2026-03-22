"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const isProduction = process.env.NODE_ENV === "production";
function emit(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    if (isProduction) {
        process.stdout.write(`${JSON.stringify({ timestamp, level, message, ...meta })}\n`);
        return;
    }
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    const line = `[${timestamp}] ${level.toUpperCase()} ${message}${extra}`;
    if (level === "error") {
        process.stderr.write(`${line}\n`);
        return;
    }
    process.stdout.write(`${line}\n`);
}
exports.logger = {
    info: (message, meta) => emit("info", message, meta),
    warn: (message, meta) => emit("warn", message, meta),
    error: (message, meta) => emit("error", message, meta),
};
