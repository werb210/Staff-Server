import { pool } from "../lib/db";

export async function executeTool(
  callId: string,
  name: string,
  params: any,
  fn: () => Promise<any>
) {
  void name;
  void params;

  let attempts = 0;

  while (attempts < 3) {
    try {
      const result = await fn();
      await pool.query("insert into tool_log values ($1)", [callId]);
      return result;
    } catch (err) {
      attempts++;
      if (attempts >= 3) {
        await pool.query("insert into dead_letter values ($1)", [callId]);
        throw err;
      }
    }
  }
}
