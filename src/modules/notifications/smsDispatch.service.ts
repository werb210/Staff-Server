import { createHash, randomUUID } from "node:crypto";
import { dbQuery } from "../../db";

function hashKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function tryBeginSmsDispatch(rawKey: string): Promise<boolean> {
  const key = hashKey(rawKey);
  const result = await dbQuery<{ id: string }>(
    `insert into sms_dispatches (id, dispatch_key)
     values ($1, $2)
     on conflict (dispatch_key) do nothing
     returning id`,
    [randomUUID(), key]
  );
  return (result.rowCount ?? 0) > 0;
}
