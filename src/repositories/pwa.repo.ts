import { randomUUID } from "crypto";
import { pool } from "../db";
import { AppError } from "../middleware/errors";

export type PwaSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  device_type: string;
  created_at: Date;
  updated_at: Date;
};

export type PwaNotification = {
  id: string;
  user_id: string;
  level: string;
  title: string;
  body: string;
  delivered_at: Date;
  acknowledged_at: Date | null;
  payload_hash: string;
};

export async function upsertPwaSubscription(params: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceType: string;
}): Promise<PwaSubscription> {
  const existing = await pool.query<PwaSubscription>(
    `select id, user_id, endpoint, p256dh, auth, device_type, created_at, updated_at
     from pwa_subscriptions
     where endpoint = $1
     limit 1`,
    [params.endpoint]
  );
  const row = existing.rows[0];
  if (row && row.user_id !== params.userId) {
    throw new AppError(
      "endpoint_in_use",
      "Subscription endpoint is already registered.",
      409
    );
  }

  if (row) {
    const updated = await pool.query<PwaSubscription>(
      `update pwa_subscriptions
       set p256dh = $1,
           auth = $2,
           device_type = $3,
           updated_at = now()
       where id = $4
       returning id, user_id, endpoint, p256dh, auth, device_type, created_at, updated_at`,
      [params.p256dh, params.auth, params.deviceType, row.id]
    );
    return updated.rows[0];
  }

  const created = await pool.query<PwaSubscription>(
    `insert into pwa_subscriptions
     (id, user_id, endpoint, p256dh, auth, device_type, created_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, now(), now())
     returning id, user_id, endpoint, p256dh, auth, device_type, created_at, updated_at`,
    [
      randomUUID(),
      params.userId,
      params.endpoint,
      params.p256dh,
      params.auth,
      params.deviceType,
    ]
  );
  return created.rows[0];
}

export async function deletePwaSubscription(params: {
  userId: string;
  endpoint: string;
}): Promise<boolean> {
  const result = await pool.query(
    `delete from pwa_subscriptions
     where user_id = $1 and endpoint = $2`,
    [params.userId, params.endpoint]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function listPwaSubscriptionsByUser(
  userId: string
): Promise<PwaSubscription[]> {
  const result = await pool.query<PwaSubscription>(
    `select id, user_id, endpoint, p256dh, auth, device_type, created_at, updated_at
     from pwa_subscriptions
     where user_id = $1
     order by updated_at desc`,
    [userId]
  );
  return result.rows;
}

export async function listPwaSubscriptions(): Promise<PwaSubscription[]> {
  const result = await pool.query<PwaSubscription>(
    `select id, user_id, endpoint, p256dh, auth, device_type, created_at, updated_at
     from pwa_subscriptions
     order by updated_at desc`
  );
  return result.rows;
}

export async function deletePwaSubscriptionByEndpoint(endpoint: string): Promise<void> {
  await pool.query(
    `delete from pwa_subscriptions
     where endpoint = $1`,
    [endpoint]
  );
}

export async function createPwaNotificationAudit(params: {
  userId: string;
  level: string;
  title: string;
  body: string;
  deliveredAt: Date;
  payloadHash: string;
}): Promise<PwaNotification> {
  const result = await pool.query<PwaNotification>(
    `insert into pwa_notifications
     (id, user_id, level, title, body, delivered_at, acknowledged_at, payload_hash)
     values ($1, $2, $3, $4, $5, $6, null, $7)
     returning id, user_id, level, title, body, delivered_at, acknowledged_at, payload_hash`,
    [
      randomUUID(),
      params.userId,
      params.level,
      params.title,
      params.body,
      params.deliveredAt,
      params.payloadHash,
    ]
  );
  return result.rows[0];
}

export async function listPwaNotificationsForUser(
  userId: string
): Promise<PwaNotification[]> {
  const result = await pool.query<PwaNotification>(
    `select id, user_id, level, title, body, delivered_at, acknowledged_at, payload_hash
     from pwa_notifications
     where user_id = $1
     order by delivered_at desc`,
    [userId]
  );
  return result.rows;
}

export async function acknowledgePwaNotification(params: {
  userId: string;
  notificationId: string;
}): Promise<boolean> {
  const result = await pool.query(
    `update pwa_notifications
     set acknowledged_at = now()
     where id = $1 and user_id = $2 and acknowledged_at is null`,
    [params.notificationId, params.userId]
  );
  return (result.rowCount ?? 0) > 0;
}
