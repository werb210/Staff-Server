"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const vitest_1 = require("vitest");
const app_1 = require("../app");
const jwt_1 = require("../auth/jwt");
const capabilities_1 = require("../auth/capabilities");
const db_1 = require("../db");
const deps_1 = require("../system/deps");
(0, vitest_1.describe)("server persistence e2e", () => {
    const authHeader = () => `Bearer ${(0, jwt_1.signJwt)({ userId: "staff-user-1", role: "Admin", capabilities: [capabilities_1.CAPABILITIES.CRM_READ] })}`;
    const leads = [];
    const calls = [];
    (0, vitest_1.beforeEach)(() => {
        leads.length = 0;
        calls.length = 0;
        deps_1.deps.db.ready = true;
        deps_1.deps.db.client = db_1.pool;
        vitest_1.vi.spyOn(db_1.pool, "query").mockImplementation(async (text, params) => {
            const sql = String(text).toLowerCase().replace(/\s+/g, " ").trim();
            if (sql.startsWith("insert into crm_leads")) {
                const row = {
                    id: `lead-${leads.length + 1}`,
                    email: params?.[0] ?? null,
                    phone: params?.[1] ?? null,
                    company_name: params?.[2] ?? null,
                    product_interest: params?.[3] ?? null,
                    source: params?.[4] ?? "crm_api",
                };
                leads.push(row);
                return { rows: [row] };
            }
            if (sql.startsWith("insert into call_logs")) {
                const now = new Date();
                const row = {
                    id: params?.[0],
                    phone_number: params?.[1],
                    from_number: params?.[2] ?? null,
                    to_number: params?.[3] ?? null,
                    twilio_call_sid: params?.[4] ?? null,
                    direction: params?.[5],
                    status: params?.[6],
                    staff_user_id: params?.[7] ?? null,
                    crm_contact_id: params?.[8] ?? null,
                    application_id: params?.[9] ?? null,
                    duration_seconds: null,
                    error_code: null,
                    error_message: null,
                    recording_sid: null,
                    recording_duration_seconds: null,
                    created_at: now,
                    started_at: now,
                    ended_at: null,
                };
                calls.push(row);
                return { rows: [row] };
            }
            if (sql.includes("from call_logs") && sql.includes("where id = $1") && sql.startsWith("select")) {
                return { rows: calls.filter((row) => row.id === params?.[0]) };
            }
            if (sql.startsWith("update call_logs set")) {
                const id = params?.[params.length - 1];
                const row = calls.find((entry) => entry.id === id);
                if (!row) {
                    return { rows: [] };
                }
                // update call_logs set status = $1, duration_seconds = $2 ... where id = $N
                const setClause = String(text).split("set")[1]?.split("where")[0] ?? "";
                const columns = setClause
                    .split(",")
                    .map((part) => part.trim())
                    .map((part) => part.split("=")[0]?.trim())
                    .filter(Boolean);
                columns.forEach((column, index) => {
                    const value = params?.[index];
                    row[column] = value;
                });
                return { rows: [row] };
            }
            if (sql.startsWith("insert into audit_events")) {
                return { rows: [] };
            }
            return { rows: [] };
        });
    });
    (0, vitest_1.it)("persists a lead on createLead", async () => {
        const res = await (0, supertest_1.default)(app_1.app).post("/api/v1/crm/lead").set("Authorization", authHeader()).send({
            name: "Ada Lovelace",
            email: "ada@example.com",
            phone: "+15550001111",
            businessName: "Analytical Engines LLC",
            productType: "term_loan",
        });
        (0, vitest_1.expect)(res.status).toBe(200);
        (0, vitest_1.expect)(leads).toHaveLength(1);
        (0, vitest_1.expect)(leads[0]?.email).toBe("ada@example.com");
        (0, vitest_1.expect)(res.body).toHaveProperty("status", "ok");
        (0, vitest_1.expect)(res.body.data).toHaveProperty("id", leads[0]?.id);
    });
    (0, vitest_1.it)("rejects lead creation with invalid email", async () => {
        const res = await (0, supertest_1.default)(app_1.app).post("/api/v1/crm/lead").set("Authorization", authHeader()).send({
            name: "Ada Lovelace",
            email: "not-an-email",
            phone: "+15550001111",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(leads).toHaveLength(0);
    });
    (0, vitest_1.it)("rejects lead creation when a required field is missing", async () => {
        const res = await (0, supertest_1.default)(app_1.app).post("/api/v1/crm/lead").set("Authorization", authHeader()).send({
            name: "Ada Lovelace",
            email: "ada@example.com",
        });
        (0, vitest_1.expect)(res.status).toBe(400);
        (0, vitest_1.expect)(leads).toHaveLength(0);
    });
    (0, vitest_1.it)("persists call creation and status updates", async () => {
        const start = await (0, supertest_1.default)(app_1.app)
            .post("/api/v1/call/start")
            .set("Authorization", authHeader())
            .send({ to: "+15550002222" });
        (0, vitest_1.expect)(start.status).toBe(200);
        (0, vitest_1.expect)(calls).toHaveLength(1);
        const callId = start.body?.data?.callId;
        const update = await (0, supertest_1.default)(app_1.app)
            .post(`/api/v1/call/${callId}/status`)
            .set("Authorization", authHeader())
            .send({ status: "completed", durationSeconds: 45 });
        (0, vitest_1.expect)(update.status).toBe(200);
        (0, vitest_1.expect)(calls[0]?.status).toBe("completed");
        (0, vitest_1.expect)(calls[0]?.duration_seconds).toBe(45);
    });
});
