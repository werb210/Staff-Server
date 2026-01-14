import { Router } from "express";
import { AppError } from "../../middleware/errors";
import requireAuth, { requireCapability } from "../../middleware/auth";
import { CAPABILITIES } from "../../auth/capabilities";
import { recordAuditEvent } from "../audit/audit.service";
import { listDailyMetrics } from "./dailyMetrics.service";
import { listPipelineSnapshots, listCurrentPipelineState } from "./pipelineSnapshot.service";
import { listLenderPerformance } from "./lenderPerformance.service";
import { listApplicationVolume } from "./applicationVolume.service";
import { listDocumentMetrics } from "./documentMetrics.service";
import { listStaffActivity } from "./staffActivity.service";
import { listLenderFunnel } from "./lenderFunnel.service";
import { pool } from "../../db";
import { safeHandler } from "../../middleware/safeHandler";

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
  if (value === undefined || value === null || value === "") {
    return null;
  }
  if (typeof value !== "string") {
    throw new AppError("invalid_range", `Invalid ${label} timestamp.`, 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError("invalid_range", `Invalid ${label} timestamp.`, 400);
  }
  return parsed;
}

function parseLimit(value: unknown): number {
  if (value === undefined) {
    return 50;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError("invalid_pagination", "Invalid limit.", 400);
  }
  return Math.min(200, Math.max(1, parsed));
}

function parseOffset(value: unknown): number {
  if (value === undefined) {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError("invalid_pagination", "Invalid offset.", 400);
  }
  return Math.max(0, parsed);
}

function assertRange(from: Date | null, to: Date | null): void {
  if (from && to && from > to) {
    throw new AppError("invalid_range", "from must be before to.", 400);
  }
}

router.use(requireAuth);
router.use(requireCapability([CAPABILITIES.REPORT_VIEW]));

router.get("/overview", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
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
}));

router.get("/pipeline", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
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
}));

router.get("/pipeline/summary", safeHandler(async (req, res) => {
  const currentState = await listCurrentPipelineState();

  await recordAuditEvent({
    action: "REPORT_VIEW",
    actorUserId: req.user?.userId ?? null,
    targetUserId: null,
    targetType: "reporting",
    targetId: "pipeline_summary",
    ip: req.ip,
    userAgent: req.get("user-agent"),
    success: true,
  });

  res.json({ currentState });
}));

router.get("/pipeline/timeseries", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset, pipelineState } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
  const parsedLimit = parseLimit(limit);
  const parsedOffset = parseOffset(offset);

  const snapshots = await listPipelineSnapshots({
    from: parsedFrom,
    to: parsedTo,
    groupBy: parseGroupBy(groupBy),
    limit: parsedLimit,
    offset: parsedOffset,
    pipelineState: typeof pipelineState === "string" ? pipelineState : null,
  });

  await recordAuditEvent({
    action: "REPORT_VIEW",
    actorUserId: req.user?.userId ?? null,
    targetUserId: null,
    targetType: "reporting",
    targetId: "pipeline_timeseries",
    ip: req.ip,
    userAgent: req.get("user-agent"),
    success: true,
  });

  res.json({ snapshots, limit: parsedLimit, offset: parsedOffset });
}));

router.get("/lenders/performance", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset, lenderId } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
  const parsedLimit = parseLimit(limit);
  const parsedOffset = parseOffset(offset);

  const performance = await listLenderPerformance({
    from: parsedFrom,
    to: parsedTo,
    groupBy: parseGroupBy(groupBy),
    limit: parsedLimit,
    offset: parsedOffset,
    lenderId: typeof lenderId === "string" ? lenderId : null,
  });
  const funnel = await listLenderFunnel({
    from: parsedFrom,
    to: parsedTo,
    groupBy: parseGroupBy(groupBy),
    limit: parsedLimit,
    offset: parsedOffset,
    lenderId: typeof lenderId === "string" ? lenderId : null,
  });

  await recordAuditEvent({
    action: "REPORT_VIEW",
    actorUserId: req.user?.userId ?? null,
    targetUserId: null,
    targetType: "reporting",
    targetId: "lender_performance",
    ip: req.ip,
    userAgent: req.get("user-agent"),
    success: true,
  });

  res.json({ performance, funnel, limit: parsedLimit, offset: parsedOffset });
}));

router.get("/applications/volume", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset, productType } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
  const parsedLimit = parseLimit(limit);
  const parsedOffset = parseOffset(offset);

  const metrics = await listApplicationVolume({
    from: parsedFrom,
    to: parsedTo,
    groupBy: parseGroupBy(groupBy),
    limit: parsedLimit,
    offset: parsedOffset,
    productType: typeof productType === "string" ? productType : null,
  });

  await recordAuditEvent({
    action: "REPORT_VIEW",
    actorUserId: req.user?.userId ?? null,
    targetUserId: null,
    targetType: "reporting",
    targetId: "application_volume",
    ip: req.ip,
    userAgent: req.get("user-agent"),
    success: true,
  });

  res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
}));

router.get("/documents/metrics", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset, documentType } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
  const parsedLimit = parseLimit(limit);
  const parsedOffset = parseOffset(offset);

  const metrics = await listDocumentMetrics({
    from: parsedFrom,
    to: parsedTo,
    groupBy: parseGroupBy(groupBy),
    limit: parsedLimit,
    offset: parsedOffset,
    documentType: typeof documentType === "string" ? documentType : null,
  });

  await recordAuditEvent({
    action: "REPORT_VIEW",
    actorUserId: req.user?.userId ?? null,
    targetUserId: null,
    targetType: "reporting",
    targetId: "document_metrics",
    ip: req.ip,
    userAgent: req.get("user-agent"),
    success: true,
  });

  res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
}));

router.get("/staff/activity", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset, staffUserId, action } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
  const parsedLimit = parseLimit(limit);
  const parsedOffset = parseOffset(offset);

  const metrics = await listStaffActivity({
    from: parsedFrom,
    to: parsedTo,
    groupBy: parseGroupBy(groupBy),
    limit: parsedLimit,
    offset: parsedOffset,
    staffUserId: typeof staffUserId === "string" ? staffUserId : null,
    action: typeof action === "string" ? action : null,
  });

  await recordAuditEvent({
    action: "REPORT_VIEW",
    actorUserId: req.user?.userId ?? null,
    targetUserId: null,
    targetType: "reporting",
    targetId: "staff_activity",
    ip: req.ip,
    userAgent: req.get("user-agent"),
    success: true,
  });

  res.json({ metrics, limit: parsedLimit, offset: parsedOffset });
}));

router.get("/conversion", safeHandler(async (_req, res) => {
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
    actorUserId: _req.user?.userId ?? null,
    targetUserId: null,
    targetType: "report",
    targetId: "conversion",
    ip: _req.ip,
    userAgent: _req.get("user-agent"),
    success: true,
  });

  res.json({ funnel: result.rows[0] ?? null });
}));

router.get("/documents", safeHandler(async (req, res) => {
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
}));

router.get("/lenders", safeHandler(async (req, res) => {
  const { from, to, groupBy, limit, offset } = req.query ?? {};
  const parsedFrom = parseDate(from, "from");
  const parsedTo = parseDate(to, "to");
  assertRange(parsedFrom, parsedTo);
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
}));

export default router;
