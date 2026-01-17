import { initializeTestDatabase, isPgMem, pool } from "../../db";

export async function ensureAuditEventSchema(): Promise<void> {
  if (!isPgMem) {
    return;
  }

  await initializeTestDatabase();

  const missingColumns: Array<{ name: string; type: string }> = [
    { name: "event_type", type: "text" },
    { name: "event_action", type: "text" },
    { name: "ip_address", type: "text" },
    { name: "metadata", type: "jsonb" },
  ];

  for (const column of missingColumns) {
    await pool.query(
      `alter table audit_events add column if not exists ${column.name} ${column.type}`
    );
  }

  await pool.query("alter table audit_events alter column action drop not null");
}
