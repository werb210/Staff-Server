import { isPgMem, pool } from "../../db";

export async function ensureAuditEventSchema(): Promise<void> {
  if (!isPgMem) {
    return;
  }

  const columnsResult = await pool.query<{ column_name: string }>(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'audit_events'`
  );
  const existing = new Set(columnsResult.rows.map((row) => row.column_name));

  const missingColumns: Array<{ name: string; type: string }> = [
    { name: "event_type", type: "text" },
    { name: "event_action", type: "text" },
    { name: "ip_address", type: "text" },
    { name: "metadata", type: "jsonb" },
  ];

  for (const column of missingColumns) {
    if (!existing.has(column.name)) {
      await pool.query(
        `alter table audit_events add column ${column.name} ${column.type}`
      );
    }
  }

  await pool.query("alter table audit_events alter column action drop not null");
  await pool.query("create sequence if not exists audit_events_id_seq");
  await pool.query(
    "alter table audit_events alter column id set default nextval('audit_events_id_seq')::text"
  );
  await pool.query(
    "alter table audit_events alter column created_at set default now()"
  );
}
