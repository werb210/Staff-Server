import { pool } from "../../db";
import { type PoolClient } from "pg";
import { getPeriodKey, type GroupBy } from "./reporting.utils";

type Queryable = Pick<PoolClient, "query">;

export type DailyMetricsRow = {
  period: string;
  applicationsCreated: number;
  applicationsSubmitted: number;
  applicationsApproved: number;
  applicationsDeclined: number;
  applicationsFunded: number;
  documentsUploaded: number;
  documentsApproved: number;
  lenderSubmissions: number;
};

function buildWhereClause(params: {
  base?: string;
  column: string;
  from: Date | null;
  to: Date | null;
}): { clause: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (params.base) {
    clauses.push(params.base);
  }
  if (params.from) {
    values.push(params.from);
    clauses.push(`${params.column} >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    clauses.push(`${params.column} < $${values.length}`);
  }
  return {
    clause: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    values,
  };
}

async function fetchDates(params: {
  runner: Queryable;
  table: string;
  column: string;
  base?: string;
  from: Date | null;
  to: Date | null;
}): Promise<Date[]> {
  const { clause, values } = buildWhereClause({
    base: params.base,
    column: params.column,
    from: params.from,
    to: params.to,
  });
  const res = await params.runner.query<{ period: Date }>(
    `select ${params.column} as period
     from ${params.table}
     ${clause}`,
    values
  );
  return res.rows.map((row) => row.period);
}

export async function listDailyMetrics(params: {
  from: Date | null;
  to: Date | null;
  groupBy: GroupBy;
  limit: number;
  offset: number;
  client?: Queryable;
}): Promise<DailyMetricsRow[]> {
  const runner = params.client ?? pool;
  const [
    createdDates,
    submittedDates,
    approvedDates,
    declinedDates,
    fundedDates,
    documentsUploadedDates,
    documentsApprovedDates,
  lenderSubmissionDates,
  ] = await Promise.all([
    fetchDates({
      runner,
      table: "applications",
      column: "created_at",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "applications",
      column: "updated_at",
      base: "pipeline_state = 'LENDER_SUBMITTED'",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "applications",
      column: "updated_at",
      base: "pipeline_state = 'APPROVED'",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "applications",
      column: "updated_at",
      base: "pipeline_state = 'DECLINED'",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "applications",
      column: "updated_at",
      base: "pipeline_state = 'FUNDED'",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "document_versions",
      column: "created_at",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "document_version_reviews",
      column: "reviewed_at",
      base: "status = 'accepted'",
      from: params.from,
      to: params.to,
    }),
    fetchDates({
      runner,
      table: "lender_submissions",
      column: "created_at",
      from: params.from,
      to: params.to,
    }),
  ]);

  const metrics = new Map<string, DailyMetricsRow>();
  const ensureRow = (period: Date) => {
    const key = getPeriodKey(period, params.groupBy);
    const existing = metrics.get(key);
    if (existing) {
      return existing;
    }
    const row: DailyMetricsRow = {
      period: key,
      applicationsCreated: 0,
      applicationsSubmitted: 0,
      applicationsApproved: 0,
      applicationsDeclined: 0,
      applicationsFunded: 0,
      documentsUploaded: 0,
      documentsApproved: 0,
      lenderSubmissions: 0,
    };
    metrics.set(key, row);
    return row;
  };

  createdDates.forEach((date) => {
    ensureRow(date).applicationsCreated += 1;
  });
  submittedDates.forEach((date) => {
    ensureRow(date).applicationsSubmitted += 1;
  });
  approvedDates.forEach((date) => {
    ensureRow(date).applicationsApproved += 1;
  });
  declinedDates.forEach((date) => {
    ensureRow(date).applicationsDeclined += 1;
  });
  fundedDates.forEach((date) => {
    ensureRow(date).applicationsFunded += 1;
  });
  documentsUploadedDates.forEach((date) => {
    ensureRow(date).documentsUploaded += 1;
  });
  documentsApprovedDates.forEach((date) => {
    ensureRow(date).documentsApproved += 1;
  });
  lenderSubmissionDates.forEach((date) => {
    ensureRow(date).lenderSubmissions += 1;
  });

  const sorted = Array.from(metrics.values()).sort((a, b) =>
    b.period.localeCompare(a.period)
  );
  return sorted.slice(params.offset, params.offset + params.limit);
}

export async function computeDailyMetricsForDate(params: {
  start: Date;
  end: Date;
  client?: Queryable;
}): Promise<Omit<DailyMetricsRow, "period">> {
  const runner = params.client ?? pool;
  const res = await runner.query<{
    applications_created: number;
    applications_submitted: number;
    applications_approved: number;
    applications_declined: number;
    applications_funded: number;
    documents_uploaded: number;
    documents_approved: number;
    lender_submissions: number;
  }>(
    `select
       (select count(*)::int from applications where created_at >= $1 and created_at < $2) as applications_created,
       (select count(*)::int from applications where pipeline_state = 'LENDER_SUBMITTED' and updated_at >= $1 and updated_at < $2) as applications_submitted,
       (select count(*)::int from applications where pipeline_state = 'APPROVED' and updated_at >= $1 and updated_at < $2) as applications_approved,
       (select count(*)::int from applications where pipeline_state = 'DECLINED' and updated_at >= $1 and updated_at < $2) as applications_declined,
       (select count(*)::int from applications where pipeline_state = 'FUNDED' and updated_at >= $1 and updated_at < $2) as applications_funded,
       (select count(*)::int from document_versions where created_at >= $1 and created_at < $2) as documents_uploaded,
       (select count(*)::int from document_version_reviews where status = 'accepted' and reviewed_at >= $1 and reviewed_at < $2) as documents_approved,
       (select count(*)::int from lender_submissions where created_at >= $1 and created_at < $2) as lender_submissions`,
    [params.start, params.end]
  );

  const row = res.rows[0];
  return {
    applicationsCreated: row.applications_created,
    applicationsSubmitted: row.applications_submitted,
    applicationsApproved: row.applications_approved,
    applicationsDeclined: row.applications_declined,
    applicationsFunded: row.applications_funded,
    documentsUploaded: row.documents_uploaded,
    documentsApproved: row.documents_approved,
    lenderSubmissions: row.lender_submissions,
  };
}
