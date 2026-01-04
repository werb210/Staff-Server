import { randomUUID } from "crypto";
import { pool } from "../../db";
import { type PoolClient } from "pg";

type Queryable = Pick<PoolClient, "query">;

export type DailyMetricsInsert = {
  metricDate: string;
  applicationsCreated: number;
  applicationsSubmitted: number;
  applicationsApproved: number;
  applicationsDeclined: number;
  applicationsFunded: number;
  documentsUploaded: number;
  documentsApproved: number;
  lenderSubmissions: number;
};

export async function upsertDailyMetrics(
  params: DailyMetricsInsert & { client?: Queryable }
): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `insert into reporting_daily_metrics
     (id, metric_date, applications_created, applications_submitted, applications_approved, applications_declined,
      applications_funded, documents_uploaded, documents_approved, lender_submissions, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
     on conflict (metric_date) do update
     set applications_created = excluded.applications_created,
         applications_submitted = excluded.applications_submitted,
         applications_approved = excluded.applications_approved,
         applications_declined = excluded.applications_declined,
         applications_funded = excluded.applications_funded,
         documents_uploaded = excluded.documents_uploaded,
         documents_approved = excluded.documents_approved,
         lender_submissions = excluded.lender_submissions`,
    [
      randomUUID(),
      params.metricDate,
      params.applicationsCreated,
      params.applicationsSubmitted,
      params.applicationsApproved,
      params.applicationsDeclined,
      params.applicationsFunded,
      params.documentsUploaded,
      params.documentsApproved,
      params.lenderSubmissions,
    ]
  );
}

export async function upsertPipelineSnapshot(params: {
  snapshotAt: Date;
  pipelineState: string;
  applicationCount: number;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `insert into reporting_pipeline_snapshots
     (id, snapshot_at, pipeline_state, application_count)
     values ($1, $2, $3, $4)
     on conflict (snapshot_at, pipeline_state) do update
     set application_count = excluded.application_count`,
    [randomUUID(), params.snapshotAt, params.pipelineState, params.applicationCount]
  );
}

export async function upsertLenderPerformance(params: {
  lenderId: string;
  periodStart: string;
  periodEnd: string;
  submissions: number;
  approvals: number;
  declines: number;
  funded: number;
  avgDecisionTimeSeconds: number;
  client?: Queryable;
}): Promise<void> {
  const runner = params.client ?? pool;
  await runner.query(
    `insert into reporting_lender_performance
     (id, lender_id, period_start, period_end, submissions, approvals, declines, funded, avg_decision_time_seconds, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     on conflict (lender_id, period_start, period_end) do update
     set submissions = excluded.submissions,
         approvals = excluded.approvals,
         declines = excluded.declines,
         funded = excluded.funded,
         avg_decision_time_seconds = excluded.avg_decision_time_seconds`,
    [
      randomUUID(),
      params.lenderId,
      params.periodStart,
      params.periodEnd,
      params.submissions,
      params.approvals,
      params.declines,
      params.funded,
      params.avgDecisionTimeSeconds,
    ]
  );
}
