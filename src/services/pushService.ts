import webpush from "web-push";
import { createHash } from "crypto";
import {
  getPwaPushPayloadMaxBytes,
  getVapidPrivateKey,
  getVapidPublicKey,
  getVapidSubject,
  isProductionEnvironment,
} from "../config";
import {
  createPwaNotificationAudit,
  deletePwaSubscriptionByEndpoint,
  listPwaSubscriptionsByUser,
} from "../repositories/pwa.repo";
import { AppError } from "../middleware/errors";
import { logError, logInfo, logWarn } from "../observability/logger";
import { trackEvent } from "../observability/appInsights";
import { getRequestContext } from "../observability/requestContext";
import { type Role } from "../auth/roles";

export type PushLevel = "normal" | "high" | "critical";

export type PushAlertPayload = {
  type: "alert";
  title: string;
  body: string;
  level: PushLevel;
  sound: boolean;
  badge?: string;
  data?: string;
};

export type PushSilentPayload = {
  type: "silent";
  data?: string;
  badgeIncrement?: number;
};

export type PushBadgePayload = {
  type: "badge";
  increment: number;
};

export type PushPayload = PushAlertPayload | PushSilentPayload | PushBadgePayload;

export type PushTarget = {
  userId: string;
  role: Role;
};

type PushStatus = {
  configured: boolean;
  subject?: string;
  publicKey?: string;
  privateKey?: string;
  error?: string;
};

let pushConfigured = false;
let pushInitAttempted = false;
let cachedStatus: PushStatus = { configured: false };

const DEFAULT_TTL_SECONDS = 3600;
const HIGH_TTL_SECONDS = 24 * 3600;
const CRITICAL_VIBRATE_PATTERN = [200, 100, 200, 100, 200];

function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function ensurePayloadSize(payload: unknown): void {
  const maxBytes = getPwaPushPayloadMaxBytes();
  const size = Buffer.byteLength(JSON.stringify(payload), "utf8");
  if (size > maxBytes) {
    throw new AppError(
      "payload_too_large",
      `Push payload exceeds ${maxBytes} bytes.`,
      413
    );
  }
}

function buildWebPushPayload(
  payload: PushPayload,
  target: PushTarget
): Record<string, unknown> {
  if (payload.type === "alert") {
    const isHigh = payload.level === "high" || payload.level === "critical";
    const isCritical = payload.level === "critical";
    const base: Record<string, unknown> = {
      type: payload.type,
      title: payload.title,
      body: payload.body,
      level: payload.level,
      sound: payload.sound,
      badge: payload.badge,
      data: payload.data,
      vibrate: isCritical ? CRITICAL_VIBRATE_PATTERN : [],
      userRole: target.role,
      sentAt: new Date().toISOString(),
    };
    if (isHigh) {
      base.requireInteraction = true;
    }
    if (isCritical) {
      base.requireInteraction = true;
      base.renotify = true;
    }
    return base;
  }

  if (payload.type === "badge") {
    return {
      type: payload.type,
      badgeIncrement: payload.increment,
      silent: true,
      contentAvailable: true,
      userRole: target.role,
      sentAt: new Date().toISOString(),
    };
  }

  return {
    type: payload.type,
    data: payload.data,
    badgeIncrement: payload.badgeIncrement ?? null,
    silent: true,
    contentAvailable: true,
    userRole: target.role,
    sentAt: new Date().toISOString(),
  };
}

function getAuditEntry(payload: PushPayload): {
  level: string;
  title: string;
  body: string;
} {
  if (payload.type === "alert") {
    return {
      level: payload.level,
      title: payload.title,
      body: payload.body,
    };
  }
  if (payload.type === "badge") {
    return {
      level: "badge",
      title: "Badge updated",
      body: `Incremented badge by ${payload.increment}.`,
    };
  }
  return {
    level: "silent",
    title: "Silent update",
    body: "Background update delivered.",
  };
}

function shouldDeleteSubscription(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410 || statusCode === 400;
}

export function initializePushService(): PushStatus {
  if (pushInitAttempted) {
    return cachedStatus;
  }
  pushInitAttempted = true;

  const publicKey = getVapidPublicKey();
  const privateKey = getVapidPrivateKey();
  const subject = getVapidSubject();

  if (!publicKey || !privateKey || !subject) {
    const error = "missing_vapid";
    cachedStatus = {
      configured: false,
      publicKey,
      privateKey,
      subject,
      error,
    };
    if (isProductionEnvironment()) {
      throw new Error("VAPID configuration is required in production.");
    }
    logWarn("push_vapid_missing", { subject, publicKey: Boolean(publicKey) });
    return cachedStatus;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    pushConfigured = true;
    cachedStatus = {
      configured: true,
      subject,
      publicKey,
      privateKey,
    };
    logInfo("push_initialized", { subject });
    return cachedStatus;
  } catch (error) {
    cachedStatus = {
      configured: false,
      subject,
      publicKey,
      privateKey,
      error: error instanceof Error ? error.message : "invalid_vapid",
    };
    if (isProductionEnvironment()) {
      throw error instanceof Error ? error : new Error("invalid_vapid");
    }
    logWarn("push_init_failed", {
      error: error instanceof Error ? error.message : "unknown_error",
    });
    return cachedStatus;
  }
}

export function getPushStatus(): PushStatus {
  if (!pushInitAttempted) {
    return initializePushService();
  }
  return cachedStatus;
}

export async function sendNotification(
  target: PushTarget,
  payload: PushPayload
): Promise<{ sent: number; failed: number }> {
  initializePushService();
  if (!pushConfigured) {
    throw new AppError(
      "push_not_configured",
      "Push notifications are not configured.",
      503
    );
  }
  ensurePayloadSize(payload);
  const subscriptions = await listPwaSubscriptionsByUser(target.userId);
  const requestId = getRequestContext()?.requestId ?? "unknown";

  const messagePayload = buildWebPushPayload(payload, target);
  const payloadHash = hashPayload(messagePayload);
  const auditEntry = getAuditEntry(payload);
  await createPwaNotificationAudit({
    userId: target.userId,
    level: auditEntry.level,
    title: auditEntry.title,
    body: auditEntry.body,
    deliveredAt: new Date(),
    payloadHash,
  });

  if (subscriptions.length === 0) {
    logWarn("push_no_subscriptions", {
      userId: target.userId,
      role: target.role,
      requestId,
    });
    return { sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;
  const isAlert = payload.type === "alert";
  const ttl = isAlert
    ? payload.level === "normal"
      ? DEFAULT_TTL_SECONDS
      : HIGH_TTL_SECONDS
    : DEFAULT_TTL_SECONDS;
  const urgency = isAlert && payload.level !== "normal" ? "high" : "normal";

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(messagePayload),
        {
          TTL: ttl,
          urgency,
        }
      );
      sent += 1;
      trackEvent({
        name: "push_sent",
        properties: {
          userId: target.userId,
          role: target.role,
          requestId,
          endpoint: subscription.endpoint,
          payloadType: payload.type,
        },
      });
      logInfo("push_sent", {
        userId: target.userId,
        role: target.role,
        requestId,
        endpoint: subscription.endpoint,
        payloadType: payload.type,
      });
    } catch (error: any) {
      failed += 1;
      const statusCode = error?.statusCode;
      if (shouldDeleteSubscription(statusCode)) {
        await deletePwaSubscriptionByEndpoint(subscription.endpoint);
      }
      trackEvent({
        name: "push_failed",
        properties: {
          userId: target.userId,
          role: target.role,
          requestId,
          endpoint: subscription.endpoint,
          payloadType: payload.type,
          statusCode: statusCode ?? "unknown",
        },
      });
      logError("push_failed", {
        userId: target.userId,
        role: target.role,
        requestId,
        endpoint: subscription.endpoint,
        payloadType: payload.type,
        statusCode: statusCode ?? "unknown",
        message: error instanceof Error ? error.message : "unknown_error",
      });
    }
  }

  return { sent, failed };
}
