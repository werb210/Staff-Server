import db from "../db.js";
import { Notification } from "../types/notification.js";

export async function createNotification(
  silo: string,
  message: string
): Promise<Notification> {
  const { rows } = await db.query<Notification>(
    `INSERT INTO notifications (silo, message)
     VALUES ($1, $2) RETURNING *`,
    [silo, message]
  );
  return rows[0];
}
