"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRoutes = auditRoutes;
exports.assertCriticalRoutes = assertCriticalRoutes;
function auditRoutes(app) {
    const routes = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            const methods = Object.keys(middleware.route.methods)
                .join(",")
                .toUpperCase();
            routes.push(`${methods} ${middleware.route.path}`);
        }
        else if (middleware.name === "router") {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    const methods = Object.keys(handler.route.methods)
                        .join(",")
                        .toUpperCase();
                    routes.push(`${methods} ${handler.route.path}`);
                }
            });
        }
    });
    return routes.sort();
}
function assertCriticalRoutes(app) {
    const routes = auditRoutes(app);
    const required = [
        "GET /health",
        "POST /auth/otp/start",
        "POST /auth/otp/verify"
    ];
    const missing = required.filter(r => !routes.includes(r));
    if (missing.length > 0) {
        console.error("CRITICAL ROUTES MISSING:");
        console.error(missing);
        process.exit(1);
    }
    console.log("ROUTE AUDIT PASSED");
}
