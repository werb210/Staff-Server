"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTelemetryProperties = buildTelemetryProperties;
const config_1 = require("../config");
const requestContext_1 = require("../middleware/requestContext");
const instanceId = process.env.INSTANCE_ID ?? process.env.HOSTNAME ?? "unknown";
function buildTelemetryProperties(properties, route) {
    const resolvedRoute = route ??
        (typeof properties?.route === "string" ? properties.route : undefined) ??
        (0, requestContext_1.getRequestRoute)();
    const merged = {
        ...properties,
        instanceId,
        buildId: config_1.COMMIT_SHA,
    };
    if (resolvedRoute) {
        merged.route = resolvedRoute;
    }
    return merged;
}
