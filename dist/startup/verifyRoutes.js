"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRoutes = verifyRoutes;
const printRoutes_1 = require("../debug/printRoutes");
const REQUIRED_ROUTES = [
    "/api/client/applications",
    "/api/documents",
    "/api/lenders",
    "/api/lenders/send",
    "/api/banking",
    "/api/credit",
    "/api/health",
];
function verifyRoutes(app) {
    const mountedPaths = (0, printRoutes_1.listRoutes)(app).map((route) => route.path);
    REQUIRED_ROUTES.forEach((requiredPath) => {
        const routeExists = mountedPaths.some((mountedPath) => mountedPath === requiredPath || mountedPath.startsWith(`${requiredPath}/`));
        if (!routeExists) {
            throw new Error(`Missing required API route: ${requiredPath}`);
        }
    });
}
