import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth/index.js";
import healthRoutes from "./routes/health.js";
import publicRoutes from "./routes/public.js";
import applicationsRouter from "./routes/applications.routes.js";
import documentsRouter from "./routes/documents.js";
import pipelineRouter from "./routes/pipeline.js";
import usersRouter from "./routes/users.js";
import crmRouter from "./routes/crm.js";
import voiceTokenRouter from "./routes/voiceToken.js";
import AccessToken from "twilio/lib/jwt/AccessToken.js";
import { requireAuth } from "./middleware/auth.js";
import { createLead } from "./modules/lead/lead.service.js";
import { respondOk } from "./utils/respondOk.js";

export function createApp() {
    const app = express();
    const HARDCODED_ALLOWED_ORIGINS = [
        "https://staff.boreal.financial",
        "https://client.boreal.financial",
        "https://boreal.financial",
        "https://www.boreal.financial",
    ];
    const envOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? "")
        .split(",").map((o) => o.trim()).filter(Boolean);
    const allowedOrigins = [...new Set([...envOrigins, ...HARDCODED_ALLOWED_ORIGINS])];

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            return callback(null, false);
        },
        credentials: true,
    }));
    app.use(express.json({ limit: "10mb" }));
    app.use(cookieParser());

    // Health — must be first
    app.get("/health", (_req, res) => { res.status(200).json({ status: "ok" }); });
    app.get("/api/health", (_req, res) => { res.status(200).json({ status: "ok" }); });
    app.get("/api/_int/health", (_req, res) => { res.status(200).json({ status: "ok" }); });
    app.get("/api/_int/production-readiness", requireAuth, (_req, res) => { res.status(200).json({ status: "ok" }); });

    // Auth
    app.use("/api/auth", authRoutes);
    app.use("/api/public", publicRoutes);

    // Simple stubs MUST come before the routers that might shadow them
    app.get("/api/crm/leads/count", requireAuth, (_req, res) => { res.json({ count: 0 }); });
    app.get("/api/support/live/count", requireAuth, (_req, res) => { res.json({ count: 0 }); });

    // Telephony token — direct generation, no redirect
    app.get("/api/telephony/token", requireAuth, (req, res) => {
        const user = req.user;
        if (!user) return res.status(401).json({ error: "unauthorized" });
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const apiKey = process.env.TWILIO_API_KEY;
        const apiSecret = process.env.TWILIO_API_SECRET;
        const voiceAppSid = process.env.TWILIO_VOICE_APP_SID;
        if (!accountSid || !apiKey || !apiSecret || !voiceAppSid) {
            return res.status(503).json({ error: "voice_not_configured" });
        }
        try {
            const identity = user.userId ?? user.sub ?? "staff_portal";
            const token = new AccessToken(accountSid, apiKey, apiSecret, { identity });
            const VoiceGrant = AccessToken.VoiceGrant;
            const grant = new VoiceGrant({ outgoingApplicationSid: voiceAppSid, incomingAllow: true });
            token.addGrant(grant);
            return res.json({ token: token.toJwt(), identity });
        } catch (err) {
            console.error("Voice token failed:", err);
            return res.status(500).json({ error: "token_failed" });
        }
    });

    // Feature routers
    app.use("/api/applications", requireAuth, applicationsRouter);
    app.use("/api/client/applications", applicationsRouter);
    app.use("/api/documents", requireAuth, documentsRouter);
    app.use("/api/pipeline", requireAuth, pipelineRouter);
    app.use("/api/users", requireAuth, usersRouter);
    app.use("/api/crm", crmRouter);
    app.use("/api", voiceTokenRouter);

    // Misc stubs
    app.post("/api/sms/send", requireAuth, (_req, res) => { res.json({ status: "ok", data: { sent: true } }); });
    app.post("/api/voice/calls/answer", requireAuth, (_req, res) => { res.json({ status: "ok", data: { answered: true } }); });
    app.post("/api/voice/calls/end", requireAuth, (_req, res) => { res.json({ status: "ok", data: { ended: true } }); });
    app.get("/api/voice/calls/log", requireAuth, (_req, res) => { res.json({ status: "ok", data: { calls: [] } }); });

    app.post("/api/v1/crm/lead", async (req, res) => {
        try {
            const payload = {
                source: req.body?.source ?? "website",
                companyName: req.body?.company_name ?? req.body?.companyName ?? req.body?.businessName,
                fullName: req.body?.full_name ?? req.body?.fullName ?? req.body?.name,
                email: req.body?.email, phone: req.body?.phone,
                requestedAmount: req.body?.requested_amount ?? req.body?.requestedAmount ?? req.body?.fundingAmount,
                monthlyRevenue: req.body?.monthly_revenue ?? req.body?.monthlyRevenue,
                notes: req.body?.notes ?? req.body?.message, tags: req.body?.tags,
            };
            const result = await createLead(payload);
            return respondOk(res, result);
        } catch (err) {
            return res.status(500).json({ status: "error", message: err?.message ?? "Failed" });
        }
    });

    app.use((req, res) => { res.status(404).json({ error: "Route not found", path: req.path }); });
    app.use((err, _req, res, _next) => {
        console.error("SERVER ERROR:", err);
        res.status(500).json({ error: "Internal server error" });
    });

    return app;
}

const app = createApp();
export default app;
