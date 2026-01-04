import { computeDailyMetricsForDate } from "./dailyMetrics.service";
import { computeLenderPerformanceForPeriod } from "./lenderPerformance.service";
import { upsertDailyMetrics, upsertLenderPerformance, upsertPipelineSnapshot } from "./reporting.repo";
import { pool } from "../../db";

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number): Date {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function startOfHour(date: Date): Date {
  const value = new Date(date);
  value.setUTCMinutes(0, 0, 0);
  return value;
}

export async function runDailyMetricsJob(date = new Date()): Promise<void> {
  const start = startOfDay(date);
  const end = addDays(start, 1);
  const metrics = await computeDailyMetricsForDate({ start, end });
  await upsertDailyMetrics({
    metricDate: start.toISOString().slice(0, 10),
    applicationsCreated: metrics.applicationsCreated,
    applicationsSubmitted: metrics.applicationsSubmitted,
    applicationsApproved: metrics.applicationsApproved,
    applicationsDeclined: metrics.applicationsDeclined,
    applicationsFunded: metrics.applicationsFunded,
    documentsUploaded: metrics.documentsUploaded,
    documentsApproved: metrics.documentsApproved,
    lenderSubmissions: metrics.lenderSubmissions,
  });
}

export async function runPipelineSnapshotJob(now = new Date()): Promise<void> {
  const snapshotAt = startOfHour(now);
  const res = await pool.query<{ pipeline_state: string; application_count: number }>(
    `select pipeline_state, count(*)::int as application_count
     from applications
     group by pipeline_state`
  );

  await Promise.all(
    res.rows.map((row) =>
      upsertPipelineSnapshot({
        snapshotAt,
        pipelineState: row.pipeline_state,
        applicationCount: row.application_count,
      })
    )
  );
}

export async function runLenderPerformanceJob(date = new Date()): Promise<void> {
  const periodStart = startOfDay(addDays(date, -1));
  const periodEnd = startOfDay(date);
  const rows = await computeLenderPerformanceForPeriod({
    start: periodStart,
    end: periodEnd,
  });

  await Promise.all(
    rows.map((row) =>
      upsertLenderPerformance({
        lenderId: row.lenderId,
        periodStart: periodStart.toISOString().slice(0, 10),
        periodEnd: periodEnd.toISOString().slice(0, 10),
        submissions: row.submissions,
        approvals: row.approvals,
        declines: row.declines,
        funded: row.funded,
        avgDecisionTimeSeconds: row.avgDecisionTimeSeconds,
      })
    )
  );
}

export function startReportingJobs(): { stop: () => void } {
  const dailyInterval = 24 * 60 * 60 * 1000;
  const hourlyInterval = 60 * 60 * 1000;

  const safeRun = (fn: () => Promise<void>, name: string) => {
    fn().catch((err) => {
      console.error(`reporting_job_failed:${name}`, err);
    });
  };

  const dailyTimer = setInterval(() => safeRun(runDailyMetricsJob, "daily_metrics"), dailyInterval);
  const hourlyTimer = setInterval(
    () => safeRun(runPipelineSnapshotJob, "pipeline_snapshot"),
    hourlyInterval
  );
  const nightlyTimer = setInterval(
    () => safeRun(runLenderPerformanceJob, "lender_performance"),
    dailyInterval
  );

  safeRun(runDailyMetricsJob, "daily_metrics");
  safeRun(runPipelineSnapshotJob, "pipeline_snapshot");
  safeRun(runLenderPerformanceJob, "lender_performance");

  return {
    stop: () => {
      clearInterval(dailyTimer);
      clearInterval(hourlyTimer);
      clearInterval(nightlyTimer);
    },
  };
}
