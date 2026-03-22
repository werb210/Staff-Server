"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.httpRequestDuration = void 0;
exports.httpMetricsMiddleware = httpMetricsMiddleware;
const prom_client_1 = __importDefault(require("prom-client"));
exports.httpRequestDuration = new prom_client_1.default.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route", "status"],
});
function httpMetricsMiddleware(req, res, next) {
    const end = exports.httpRequestDuration.startTimer();
    res.on("finish", () => {
        end({
            method: req.method,
            route: req.route?.path ?? req.path,
            status: String(res.statusCode),
        });
    });
    next();
}
