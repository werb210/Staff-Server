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
const hasRealDbConfig = Boolean(process.env.DATABASE_URL);
const runRealDbIntegration = process.env.RUN_REAL_DB_TESTS === "1" && hasRealDbConfig;
if (!runRealDbIntegration) {
    test.skip("real db not configured for CI", () => { });
}
else {
    describe("real db integration", () => {
        const originalNodeEnv = process.env.NODE_ENV;
        beforeAll(async () => {
            process.env.NODE_ENV = "development";
            const { runQuery } = await Promise.resolve().then(() => __importStar(require("../lib/db")));
            await expect(runQuery("SELECT 1")).resolves.toBeDefined();
        });
        afterAll(() => {
            process.env.NODE_ENV = originalNodeEnv;
        });
        test("real db connection works", async () => {
            const { runQuery } = await Promise.resolve().then(() => __importStar(require("../lib/db")));
            const res = await runQuery("SELECT 1 as ok");
            expect(res.rows).toHaveLength(1);
            expect(res.rows[0]).toEqual({ ok: 1 });
        });
        test("real db supports basic deterministic query behavior", async () => {
            const { runQuery } = await Promise.resolve().then(() => __importStar(require("../lib/db")));
            const marker = `from_real_test_${Date.now()}`;
            const insert = await runQuery(`INSERT INTO health_check (status) VALUES ($1) RETURNING status`, [marker]);
            expect(insert.rows[0]).toEqual({ status: marker });
            const after = await runQuery(`SELECT COUNT(*)::int AS count FROM health_check WHERE status = $1`, [marker]);
            expect(after.rows[0].count).toBeGreaterThan(0);
        });
    });
}
