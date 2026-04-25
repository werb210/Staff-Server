import express from "express";
import { safeHandler } from "../middleware/safeHandler.js";

const router = express.Router();

export async function proxyMayaToAgent(
  agentPath: string,
  method: "POST" | "GET",
  body: unknown,
  res: express.Response
) {
  const mayaUrl = process.env.MAYA_URL || process.env.MAYA_SERVICE_URL;
  if (!mayaUrl) {
    res.status(503).json({
      error: "maya_unavailable",
      message: "Agent service not configured.",
    });
    return;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const upstream = await fetch(`${mayaUrl}${agentPath}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : {},
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "agent_proxy_error";
    res.status(503).json({ error: "agent_proxy_error", message });
  }
}

router.post(
  "/chat",
  safeHandler(async (req: any, res: any) => {
    await proxyMayaToAgent("/api/maya/chat", "POST", req.body, res);
  })
);

router.post(
  "/message",
  safeHandler(async (req: any, res: any) => {
    await proxyMayaToAgent("/api/maya/message", "POST", req.body, res);
  })
);

router.post(
  "/escalate",
  safeHandler(async (req: any, res: any) => {
    await proxyMayaToAgent("/maya/escalate", "POST", req.body, res);
  })
);

router.get(
  "/health",
  safeHandler(async (_req: any, res: any) => {
    const mayaUrl = process.env.MAYA_URL || process.env.MAYA_SERVICE_URL;
    const result: any = {
      env: {
        MAYA_URL: !!mayaUrl,
        JWT_SECRET: !!process.env.JWT_SECRET,
      },
    };
    if (!mayaUrl) {
      return res.status(503).json({ ok: false, reason: "MAYA_URL not set", ...result });
    }
    try {
      const ctrl = new AbortController();
      setTimeout(() => ctrl.abort(), 5000);
      const r = await fetch(`${mayaUrl}/health`, { method: "GET", signal: ctrl.signal });
      const body = await r.text();
      return res.status(r.ok ? 200 : 502).json({
        ok: r.ok, agent_status: r.status, agent_body: body.slice(0, 500), ...result,
      });
    } catch (e: any) {
      return res.status(502).json({ ok: false, reason: "agent_unreachable", error: e?.message, ...result });
    }
  })
);

export default router;
