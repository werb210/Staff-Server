import { pool } from "../../db";
import { type PoolClient } from "pg";
import { getPeriodKey, type GroupBy } from "./reporting.utils";

type Queryable = Pick<PoolClient, "query">;

export type LenderPerformanceRow = {
  period: string;
  lenderId: string;
  submissions: number;
  approvals: number;
  declines: number;
  funded: number;
  avgDecisionTimeSeconds: number;
};

function buildWhereClause(params: {
  column: string;
  from: Date | null;
  to: Date | null;
}): { clause: string; values: unknown[] } {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (params.from) {
    values.push(params.from);
    clauses.push(`${params.column} >= $${values.length}`);
  }
  if (params.to) {
    values.push(params.to);
    clauses.push(`${params.column} < $${values.length}`);
  }
  return {
    clause: clauses.length > 0 ? `and ${clauses.join(" and ")}` : "",
    values,
  };
}

export async function listLenderPerformance(params: {
  from: Date | null;
  to: Date | null;
  groupBy: GroupBy;
  limit: number;
  offset: number;
  client?: Queryable;
}): Promise<LenderPerformanceRow[]> {
  const runner = params.client ?? pool;
  const { clause, values } = buildWhereClause({
    column: "ls.created_at",
    from: params.from,
    to: params.to,
  });
  const res = await runner.query<{
    period: Date;
    lender_id: string;
    pipeline_state: string;
    submitted_at: Date;
    updated_at: Date;
  }>(
    `select
       ls.created_at as period,
       ls.lender_id,
       a.pipeline_state,
       ls.submitted_at,
       a.updated_at
     from lender_submissions ls
     join applications a on a.id = ls.application_id
     where ls.submitted_at is not null
       ${clause}`,
    values
  );

  const aggregated = new Map<string, {
    period: string;
    lenderId: string;
    submissions: number;
    approvals: number;
    declines: number;
    funded: number;
    decisionTimeTotal: number;
    decisionCount: number;
  }>();

  res.rows.forEach((row) => {
    const periodKey = getPeriodKey(row.period, params.groupBy);
    const key = `${periodKey}:${row.lender_id}`;
    const existing = aggregated.get(key) ?? {
      period: periodKey,
      lenderId: row.lender_id,
      submissions: 0,
      approvals: 0,
      declines: 0,
      funded: 0,
      decisionTimeTotal: 0,
      decisionCount: 0,
    };
    existing.submissions += 1;
    if (row.pipeline_state === "APPROVED") {
      existing.approvals += 1;
    }
    if (row.pipeline_state === "DECLINED") {
      existing.declines += 1;
    }
    if (row.pipeline_state === "FUNDED") {
      existing.funded += 1;
    }
    if (["APPROVED", "DECLINED", "FUNDED"].includes(row.pipeline_state)) {
      const decisionSeconds = Math.max(
        0,
        Math.round((row.updated_at.getTime() - row.submitted_at.getTime()) / 1000)
      );
      existing.decisionTimeTotal += decisionSeconds;
      existing.decisionCount += 1;
    }
    aggregated.set(key, existing);
  });

  const sorted = Array.from(aggregated.values()).sort((a, b) => {
    if (a.period === b.period) {
      return a.lenderId.localeCompare(b.lenderId);
    }
    return b.period.localeCompare(a.period);
  });

  const sliced = sorted.slice(params.offset, params.offset + params.limit);
  return sliced.map((row) => ({
    period: row.period,
    lenderId: row.lenderId,
    submissions: row.submissions,
    approvals: row.approvals,
    declines: row.declines,
    funded: row.funded,
    avgDecisionTimeSeconds:
      row.decisionCount > 0
        ? Math.round(row.decisionTimeTotal / row.decisionCount)
        : 0,
  }));
}

export async function computeLenderPerformanceForPeriod(params: {
  start: Date;
  end: Date;
  client?: Queryable;
}): Promise<Array<Omit<LenderPerformanceRow, "period">>> {
  const runner = params.client ?? pool;
  const res = await runner.query<{
    lender_id: string;
    pipeline_state: string;
    submitted_at: Date;
    updated_at: Date;
  }>(
    `select
       ls.lender_id,
       a.pipeline_state,
       ls.submitted_at,
       a.updated_at
     from lender_submissions ls
     join applications a on a.id = ls.application_id
     where ls.submitted_at is not null
       and ls.created_at >= $1
       and ls.created_at < $2`,
    [params.start, params.end]
  );

  const aggregated = new Map<string, {
    lenderId: string;
    submissions: number;
    approvals: number;
    declines: number;
    funded: number;
    decisionTimeTotal: number;
    decisionCount: number;
  }>();

  res.rows.forEach((row) => {
    const key = row.lender_id;
    const existing = aggregated.get(key) ?? {
      lenderId: row.lender_id,
      submissions: 0,
      approvals: 0,
      declines: 0,
      funded: 0,
      decisionTimeTotal: 0,
      decisionCount: 0,
    };
    existing.submissions += 1;
    if (row.pipeline_state === "APPROVED") {
      existing.approvals += 1;
    }
    if (row.pipeline_state === "DECLINED") {
      existing.declines += 1;
    }
    if (row.pipeline_state === "FUNDED") {
      existing.funded += 1;
    }
    if (["APPROVED", "DECLINED", "FUNDED"].includes(row.pipeline_state)) {
      const decisionSeconds = Math.max(
        0,
        Math.round((row.updated_at.getTime() - row.submitted_at.getTime()) / 1000)
      );
      existing.decisionTimeTotal += decisionSeconds;
      existing.decisionCount += 1;
    }
    aggregated.set(key, existing);
  });

  return Array.from(aggregated.values()).map((row) => ({
    lenderId: row.lenderId,
    submissions: row.submissions,
    approvals: row.approvals,
    declines: row.declines,
    funded: row.funded,
    avgDecisionTimeSeconds:
      row.decisionCount > 0
        ? Math.round(row.decisionTimeTotal / row.decisionCount)
        : 0,
  }));
}
