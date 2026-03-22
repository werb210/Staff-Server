"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createServer = createServer;
const app_1 = require("../app");
const config_1 = require("../config");
const db_1 = require("../db");
const schemaAssert_1 = require("../db/schemaAssert");
const logger_1 = require("../observability/logger");
const twilio_1 = require("../services/twilio");
const lenderProductRequirementsService_1 = require("../services/lenderProductRequirementsService");
const pushService_1 = require("../services/pushService");
const followup_scheduler_1 = require("../modules/followup/followup.scheduler");
async function createServer(options = {}) {
    const app = (0, app_1.buildApp)();
    app.set("trust proxy", true);
    const config = options.config ?? {};
    const db = {
        warmUpDatabase: db_1.warmUpDatabase,
        assertRequiredSchema: schemaAssert_1.assertRequiredSchema,
        ...options.db,
    };
    const services = {
        initializePushService: pushService_1.initializePushService,
        getTwilioClient: twilio_1.getTwilioClient,
        getVerifyServiceSid: twilio_1.getVerifyServiceSid,
        seedRequirementsForAllProducts: lenderProductRequirementsService_1.seedRequirementsForAllProducts,
        startFollowUpJobs: followup_scheduler_1.startFollowUpJobs,
        ...options.services,
    };
    const isProduction = (process.env.NODE_ENV ?? "development") === "production";
    const isTestMode = process.env.TEST_MODE === "true";
    if (!config.skipEnvCheck) {
        (0, config_1.assertEnv)();
    }
    if (!config.skipServicesInit && !isTestMode) {
        services.initializePushService?.();
        services.getTwilioClient?.();
        services.getVerifyServiceSid?.();
    }
    if (!config.skipWarmup) {
        try {
            await db.warmUpDatabase?.();
        }
        catch (err) {
            if (isProduction) {
                throw err;
            }
            (0, logger_1.logError)("database_warmup_skipped_non_prod", {
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (!config.skipSchemaCheck) {
        try {
            await db.assertRequiredSchema?.();
        }
        catch (err) {
            if (isProduction) {
                (0, logger_1.logError)("fatal_schema_mismatch", {
                    message: err instanceof Error ? err.message : String(err),
                });
                throw err;
            }
            (0, logger_1.logError)("schema_check_skipped_non_prod", {
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (!config.skipSeed) {
        try {
            await services.seedRequirementsForAllProducts?.();
        }
        catch (err) {
            if (isProduction) {
                throw err;
            }
            (0, logger_1.logError)("seed_skipped_non_prod", {
                message: err instanceof Error ? err.message : String(err),
            });
        }
    }
    if (!config.skipCorsCheck) {
        try {
            (0, app_1.assertCorsConfig)();
        }
        catch (err) {
            (0, logger_1.logError)("fatal_cors_assert", {
                message: err instanceof Error ? err.message : String(err),
            });
            throw err;
        }
    }
    (0, app_1.registerApiRoutes)(app);
    if (!isTestMode && config.startFollowUpJobs !== false) {
        services.startFollowUpJobs?.();
    }
    // ===============================
    // JSON 404 handler (MUST BE LAST ROUTE)
    // ===============================
    app.use((req, res) => {
        res.status(404).json({
            error: "Not Found",
            path: req.originalUrl,
            method: req.method,
        });
    });
    // ===============================
    // Global error handler (MUST BE LAST MIDDLEWARE)
    // ===============================
    app.use((err, _req, res, _next) => {
        console.error("Unhandled error:", err);
        res.status(err?.status || 500).json({
            error: err?.message || "Internal Server Error",
        });
    });
    return app;
}
