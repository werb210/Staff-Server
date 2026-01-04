import { pool } from "../../db";
import { type PoolClient } from "pg";
import { getPeriodKey, type GroupBy } from "./reporting.utils";

type Queryable = Pick<PoolClient, "query">;

export type PipelineSnapshotRow = {
  period: string;
  pipelineState: string;
  applicationCount: number;
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
    clause: clauses.length > 0 ? `where ${clauses.join(" and ")}` : "",
    values,
  };
}

export async function listPipelineSnapshots(params: {
  from: Date | null;
  to: Date | null;
  groupBy: GroupBy;
  limit: number;
  offset: number;
  client?: Queryable;
}): Promise<PipelineSnapshotRow[]> {
  const runner = params.client ?? pool;
  const { clause, values } = buildWhereClause({
    column: "updated_at",
    from: params.from,
    to: params.to,
  });
  const res = await runner.query<{ period: Date; pipeline_state: string }>(
    `select updated_at as period,
            pipeline_state
     from applications
     ${clause}`,
    values
  );

  const aggregated = new Map<string, PipelineSnapshotRow>();
  res.rows.forEach((row) => {
    const periodKey = getPeriodKey(row.period, params.groupBy);
    const key = `${periodKey}:${row.pipeline_state}`;
    const existing = aggregated.get(key) ?? {
      period: periodKey,
      pipelineState: row.pipeline_state,
      applicationCount: 0,
    };
    existing.applicationCount += 1;
    aggregated.set(key, existing);
  });

  const sorted = Array.from(aggregated.values()).sort((a, b) => {
    if (a.period === b.period) {
      return a.pipelineState.localeCompare(b.pipelineState);
    }
    return b.period.localeCompare(a.period);
  });

  return sorted.slice(params.offset, params.offset + params.limit);
}

export async function listCurrentPipelineState(params?: {
  client?: Queryable;
}): Promise<Array<{ pipelineState: string; applicationCount: number }>> {
  const runner = params?.client ?? pool;
  const res = await runner.query<{ pipeline_state: string; application_count: number }>(
    `select pipeline_state, application_count
     from vw_pipeline_current_state`
  );
  return res.rows.map((row) => ({
    pipelineState: row.pipeline_state,
    applicationCount: row.application_count,
  }));
}
