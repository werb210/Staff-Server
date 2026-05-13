// BF_SERVER_BLOCK_v214_MAYA_STAFF_PIPELINE_QUERY_v1
// Routes called by the agent (Maya service) on behalf of staff
// audience. Service-JWT-authed with the shared JWT_SECRET. Every
// call writes a row to maya_audit.
import { randomUUID } from "node:crypto";
import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { logError } from "../observability/logger.js";
import { runPipelineQuery } from "../services/mayaPipelineQuery.js";

const router = Router();

function getSecret(): string {
  return process.env.JWT_SECRET || "";
}

function verifyMayaService(req: Request): { source: string } | null {
  const auth = req.header("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const secret = getSecret();
  if (!secret) return null;
  try {
    const p = jwt.verify(m[1], secret) as { kind?: string; source?: string };
    if (p?.kind !== "service") return null;
    // Maya service mints JWTs with source='maya-service' or
    // source='agent'. Accept either so the agent repo doesn't
    // have to coordinate naming.
    if (p.source !== "maya-service" && p.source !== "agent") return null;
    return { source: String(p.source) };
  } catch {
    return null;
  }
}

async function audit(opts: {
  audience: "visitor" | "client" | "staff";
  tool: string;
  args: unknown;
  ok: boolean;
  summary: string;
  errorCode?: string;
  userId?: string | null;
  sessionId?: string | null;
}): Promise<void> {
  try {
    await pool.query(
      `INSERT INTO maya_audit
         (id, audience, user_id, session_id, tool, args_redacted, result_summary, ok, error_code)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)`,
      [
        randomUUID(),
        opts.audience,
        opts.userId ?? null,
        opts.sessionId ?? null,
        opts.tool,
        JSON.stringify(opts.args ?? null),
        opts.summary.slice(0, 500),
        opts.ok,
        opts.errorCode ?? null,
      ],
    );
  } catch (e: any) {
    // Never block the response on audit failure.
    logError("maya_audit_insert_failed", {
      code: "maya_audit_insert_failed",
      tool: opts.tool,
      error: e?.message ?? "unknown",
    });
  }
}

router.post(
  "/staff/pipeline-query",
  safeHandler(async (req: Request, res: Response) => {
    const svc = verifyMayaService(req);
    if (!svc) {
      return res.status(401).json({ ok: false, error: "service_jwt_required" });
    }
    const question = typeof req.body?.question === "string" ? req.body.question : "";
    if (!question.trim()) {
      return res.status(400).json({ ok: false, error: "question_required" });
    }
    try {
      const result = await runPipelineQuery(question);
      await audit({
        audience: "staff",
        tool: "pipeline.query",
        args: { question },
        ok: !!result.ok,
        summary: result.summary ?? "",
        userId: typeof req.body?.user_id === "string" ? req.body.user_id : null,
        sessionId: typeof req.body?.session_id === "string" ? req.body.session_id : null,
      });
      return res.json(result);
    } catch (e: any) {
      await audit({
        audience: "staff",
        tool: "pipeline.query",
        args: { question },
        ok: false,
        summary: e?.message ?? "error",
        errorCode: "pipeline_query_exception",
      });
      logError("maya_pipeline_query_failed", {
        code: "maya_pipeline_query_failed",
        error: e?.message ?? "unknown",
      });
      return res.status(500).json({ ok: false, error: "pipeline_query_failed" });
    }
  }),
);

export default router;
