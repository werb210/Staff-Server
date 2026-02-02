import { randomUUID } from "crypto";
import { type PoolClient } from "pg";
import { pool } from "../../db";

type Queryable = Pick<PoolClient, "query">;

export type CallDirection = "outbound" | "inbound";
export type CallStatus = "initiated" | "ringing" | "connected" | "ended" | "failed";

export type CallLogRecord = {
  id: string;
  phone_number: string;
  direction: CallDirection;
  status: CallStatus;
  duration_seconds: number | null;
  staff_user_id: string | null;
  crm_contact_id: string | null;
  application_id: string | null;
  created_at: Date;
  ended_at: Date | null;
};

export async function createCallLog(params: {
  phoneNumber: string;
  direction: CallDirection;
  status: CallStatus;
  staffUserId: string | null;
  crmContactId?: string | null;
  applicationId?: string | null;
  client?: Queryable;
}): Promise<CallLogRecord> {
  const runner = params.client ?? pool;
  const id = randomUUID();
  const res = await runner.query<CallLogRecord>(
    `insert into call_logs
     (id, phone_number, direction, status, staff_user_id, crm_contact_id, application_id, created_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     returning id, phone_number, direction, status, duration_seconds, staff_user_id, crm_contact_id,
               application_id, created_at, ended_at`,
    [
      id,
      params.phoneNumber,
      params.direction,
      params.status,
      params.staffUserId,
      params.crmContactId ?? null,
      params.applicationId ?? null,
    ]
  );
  return res.rows[0];
}

export async function findCallLogById(
  id: string,
  client?: Queryable
): Promise<CallLogRecord | null> {
  const runner = client ?? pool;
  const res = await runner.query<CallLogRecord>(
    `select id, phone_number, direction, status, duration_seconds, staff_user_id, crm_contact_id,
            application_id, created_at, ended_at
     from call_logs
     where id = $1
     limit 1`,
    [id]
  );
  return res.rows[0] ?? null;
}

export async function listCallLogs(params: {
  contactId?: string | null;
  applicationId?: string | null;
  client?: Queryable;
}): Promise<CallLogRecord[]> {
  const runner = params.client ?? pool;
  const filters: string[] = [];
  const values: string[] = [];
  if (params.contactId) {
    values.push(params.contactId);
    filters.push(`crm_contact_id = $${values.length}`);
  }
  if (params.applicationId) {
    values.push(params.applicationId);
    filters.push(`application_id = $${values.length}`);
  }
  const whereClause = filters.length > 0 ? `where ${filters.join(" and ")}` : "";
  const res = await runner.query<CallLogRecord>(
    `select id, phone_number, direction, status, duration_seconds, staff_user_id, crm_contact_id,
            application_id, created_at, ended_at
     from call_logs
     ${whereClause}
     order by created_at desc`,
    values
  );
  return res.rows;
}

export async function updateCallLogStatus(params: {
  id: string;
  status: CallStatus;
  durationSeconds?: number | null;
  endedAt?: Date | null;
  client?: Queryable;
}): Promise<CallLogRecord | null> {
  const runner = params.client ?? pool;
  const updates: Array<{ name: string; value: unknown }> = [
    { name: "status", value: params.status },
  ];
  if (params.durationSeconds !== undefined) {
    updates.push({ name: "duration_seconds", value: params.durationSeconds });
  }
  if (params.endedAt !== undefined) {
    updates.push({ name: "ended_at", value: params.endedAt });
  }

  const setClauses = updates.map(
    (entry, index) => `${entry.name} = $${index + 1}`
  );
  const values = updates.map((entry) => entry.value);
  values.push(params.id);

  const res = await runner.query<CallLogRecord>(
    `update call_logs
     set ${setClauses.join(", ")}
     where id = $${values.length}
     returning id, phone_number, direction, status, duration_seconds, staff_user_id, crm_contact_id,
               application_id, created_at, ended_at`,
    values
  );
  return res.rows[0] ?? null;
}
