import { Router } from "express";
import { AppError } from "../../middleware/errors";
import { requireAuth, requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { recordAuditEvent } from "../audit/audit.service";
import { listDailyMetrics } from "./dailyMetrics.service";
import { listPipelineSnapshots, listCurrentPipelineState } from "./pipelineSnapshot.service";
import { listLenderPerformance } from "./lenderPerformance.service";
import { pool } from "../../db";

const router = Router();

const GROUP_BY_VALUES = ["day", "week", "month"] as const;

type GroupBy = (typeof GROUP_BY_VALUES)[number];

function parseGroupBy(value: unknown): GroupBy {
  if (typeof value === "string" && GROUP_BY_VALUES.includes(value as GroupBy)) {
    return value as GroupBy;
  }
  return "day";
}

function parseDate(value: unknown, label: string): Date | null {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("invalid_range", `Invalid ${label} timestamp.`, 400);
  }
  return parsed;
}

function parseLimit(value: unknown): number {
  return Math.min(200, Math.max(1, Number(value ?? 50) || 50));
}

function parseOffset(value: unknown): number {
  return Math.max(0, Number(value ?? 0) || 0);
}

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.REPORT_VIEW]));

router.get("/overview", async (req, res, next) => {
  try {
    const { from, to, groupBy, limit, offset } = req.query ?? {};
    const parsedFrom = parseDate(from, "from");
    const parsedTo = parseDate(to, "to");
    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new AppError("invalid_range", "from must be before to.", 400);
    }
    const parsedLimit = parseLimit(limit);
    const parsedOffset = parseOffset(offset);

    const metrics = await listDailyMetrics({
      from: parsedFrom,
      to: parsedTo,
      groupBy: parseGroupBy(groupBy),
      limit: parsedLimit,
      offset: parsedOffset,
    });

    await recordAuditEvent({
      action: "REPORT_VIEW",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "report",
      targetId: "overview",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });

    res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
  } catch (err) {
    next(err);
  }
});

router.get("/pipeline", async (req, res, next) => {
  try {
    const { from, to, groupBy, limit, offset } = req.query ?? {};
    const parsedFrom = parseDate(from, "from");
    const parsedTo = parseDate(to, "to");
    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new AppError("invalid_range", "from must be before to.", 400);
    }
    const parsedLimit = parseLimit(limit);
    const parsedOffset = parseOffset(offset);

    const snapshots = await listPipelineSnapshots({
      from: parsedFrom,
      to: parsedTo,
      groupBy: parseGroupBy(groupBy),
      limit: parsedLimit,
      offset: parsedOffset,
    });
    const currentState = await listCurrentPipelineState();

    await recordAuditEvent({
      action: "REPORT_VIEW",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "report",
      targetId: "pipeline",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });

    res.json({ currentState, snapshots, limit: parsedLimit, offset: parsedOffset });
  } catch (err) {
    next(err);
  }
});

router.get("/conversion", async (req, res, next) => {
  try {
    const result = await pool.query<{
      applications_created: number;
      applications_submitted: number;
      applications_approved: number;
      applications_funded: number;
    }>(
      `select applications_created, applications_submitted, applications_approved, applications_funded
       from vw_application_conversion_funnel`
    );

    await recordAuditEvent({
      action: "REPORT_VIEW",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "report",
      targetId: "conversion",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });

    res.json({ funnel: result.rows[0] ?? null });
  } catch (err) {
    next(err);
  }
});

router.get("/documents", async (req, res, next) => {
  try {
    const result = await pool.query<{
      documents_uploaded: number;
      documents_reviewed: number;
      documents_approved: number;
      approval_rate: number;
    }>(
      `select documents_uploaded, documents_reviewed, documents_approved, approval_rate
       from vw_document_processing_stats`
    );

    await recordAuditEvent({
      action: "REPORT_VIEW",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "report",
      targetId: "documents",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });

    res.json({ documents: result.rows[0] ?? null });
  } catch (err) {
    next(err);
  }
});

router.get("/lenders", async (req, res, next) => {
  try {
    const { from, to, groupBy, limit, offset } = req.query ?? {};
    const parsedFrom = parseDate(from, "from");
    const parsedTo = parseDate(to, "to");
    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new AppError("invalid_range", "from must be before to.", 400);
    }
    const parsedLimit = parseLimit(limit);
    const parsedOffset = parseOffset(offset);

    const performance = await listLenderPerformance({
      from: parsedFrom,
      to: parsedTo,
      groupBy: parseGroupBy(groupBy),
      limit: parsedLimit,
      offset: parsedOffset,
    });
    const conversions = await pool.query<{
      lender_id: string;
      submissions: number;
      approvals: number;
      declines: number;
      funded: number;
      approval_rate: number;
      funding_rate: number;
    }>(
      `select lender_id, submissions, approvals, declines, funded, approval_rate, funding_rate
       from vw_lender_conversion
       order by lender_id
       limit $1 offset $2`,
      [parsedLimit, parsedOffset]
    );

    await recordAuditEvent({
      action: "REPORT_VIEW",
      actorUserId: req.user?.userId ?? null,
      targetUserId: null,
      targetType: "report",
      targetId: "lenders",
      ip: req.ip,
      userAgent: req.get("user-agent"),
      success: true,
    });

    res.json({
      performance,
      conversions: conversions.rows,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
