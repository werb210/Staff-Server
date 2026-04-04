"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const deps_1 = require("../system/deps");
const { queryMock } = vitest_1.vi.hoisted(() => ({ queryMock: vitest_1.vi.fn() }));
vitest_1.vi.mock("../db", async () => {
    const actual = await vitest_1.vi.importActual("../db");
    return {
        ...actual,
        pool: {
            query: queryMock,
        },
    };
});
(0, vitest_1.describe)("db resilience", () => {
    (0, vitest_1.beforeEach)(() => {
        queryMock.mockReset();
        deps_1.deps.db.ready = false;
        deps_1.deps.db.error = null;
    });
    (0, vitest_1.it)("keeps server alive when DB is unavailable during init", async () => {
        queryMock.mockRejectedValue(new Error("offline"));
        const { initDependencies } = await Promise.resolve().then(() => __importStar(require("../system/init")));
        await (0, vitest_1.expect)(initDependencies()).resolves.toBeUndefined();
        (0, vitest_1.expect)(deps_1.deps.db.ready).toBe(false);
    });
    (0, vitest_1.it)("marks DB ready when connectivity succeeds before retries are exhausted", async () => {
        queryMock
            .mockRejectedValueOnce(new Error("offline"))
            .mockRejectedValueOnce(new Error("offline"))
            .mockResolvedValueOnce({ rows: [] });
        const { initDependencies } = await Promise.resolve().then(() => __importStar(require("../system/init")));
        await initDependencies();
        (0, vitest_1.expect)(deps_1.deps.db.ready).toBe(true);
        (0, vitest_1.expect)(queryMock).toHaveBeenCalledTimes(3);
    });
    (0, vitest_1.it)("throws a 503 error when querying while DB is not ready", async () => {
        const { safeQuery } = await Promise.resolve().then(() => __importStar(require("../db")));
        await (0, vitest_1.expect)(safeQuery("select 1")).rejects.toMatchObject({
            message: "DB_NOT_READY",
            status: 503,
        });
    });
});
