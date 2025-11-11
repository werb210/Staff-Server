import { randomUUID } from "crypto";
import { Router } from "express";
import { z } from "zod";

import { isPlaceholderSilo, respondWithPlaceholder } from "../utils/placeholder.js";
import type { SiloKey } from "../silos/types.js";

const router = Router();

const NotificationChannelSchema = z.enum(["sms", "email", "push"]);
const NotificationStatusSchema = z.enum(["queued", "sent", "failed"]);

const NotificationCreateSchema = z.object({
  channel: NotificationChannelSchema,
  recipient: z.string().min(1),
  message: z.string().min(1),
  subject: z.string().optional(),
  metadata: z
    .record(z.string().min(1), z.string().min(1))
    .optional(),
  status: NotificationStatusSchema.optional(),
});

const NotificationTriggerSchema = NotificationCreateSchema.extend({
  status: z.never().optional(),
});

type NotificationChannel = z.infer<typeof NotificationChannelSchema>;
type NotificationStatus = z.infer<typeof NotificationStatusSchema>;

type Notification = {
  id: string;
  channel: NotificationChannel;
  recipient: string;
  subject?: string;
  message: string;
  status: NotificationStatus;
  createdAt: string;
  metadata?: Record<string, string>;
};

const defaultNotifications: Record<SiloKey, Notification[]> = {
  BF: [
    {
      id: randomUUID(),
      channel: "sms",
      recipient: "+15551234567",
      message: "Reminder: Upload the most recent financial statement.",
      status: "sent",
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      channel: "email",
      recipient: "finance-team@bf.example",
      subject: "Pipeline shift detected",
      message: "Two applications moved to review in the past hour.",
      status: "queued",
      createdAt: new Date().toISOString(),
      metadata: { priority: "high" },
    },
  ],
  SLF: [
    {
      id: randomUUID(),
      channel: "email",
      recipient: "sam.ops@slf.example",
      subject: "Scheduled follow-up",
      message: "Client requested a call back on Friday.",
      status: "sent",
      createdAt: new Date().toISOString(),
    },
  ],
  BI: [
    {
      id: randomUUID(),
      channel: "push",
      recipient: "ops-dashboard",
      message: "Business intelligence data sync completed.",
      status: "queued",
      createdAt: new Date().toISOString(),
    },
  ],
};

const notificationStore = new Map<SiloKey, Notification[]>();

const getNotificationsForSilo = (silo: SiloKey): Notification[] => {
  if (!notificationStore.has(silo)) {
    const seed = defaultNotifications[silo] ?? [];
    notificationStore.set(silo, [...seed]);
  }
  return notificationStore.get(silo)!;
};

const recordNotification = (silo: SiloKey, notification: Notification): Notification => {
  const list = getNotificationsForSilo(silo);
  list.unshift(notification);
  return notification;
};

router.get("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const notifications = getNotificationsForSilo(req.silo!.silo);
  res.json({ message: "OK", data: notifications });
});

router.get("/summary", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const notifications = getNotificationsForSilo(req.silo!.silo);
  const summary = notifications.reduce<
    Record<NotificationChannel, { channel: NotificationChannel; count: number }>
  >(
    (acc, notification) => {
      const existing = acc[notification.channel] ?? {
        channel: notification.channel,
        count: 0,
      };
      existing.count += 1;
      acc[notification.channel] = existing;
      return acc;
    },
    {
      sms: { channel: "sms", count: 0 },
      email: { channel: "email", count: 0 },
      push: { channel: "push", count: 0 },
    },
  );

  res.json({
    message: "OK",
    data: {
      total: notifications.length,
      channels: Object.values(summary),
    },
  });
});

router.post("/", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = NotificationCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid notification payload" });
  }
  const notification: Notification = {
    id: randomUUID(),
    channel: parsed.data.channel,
    recipient: parsed.data.recipient,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: parsed.data.status ?? "queued",
    createdAt: new Date().toISOString(),
    metadata: parsed.data.metadata,
  };
  recordNotification(req.silo!.silo, notification);
  res.status(201).json({ message: "OK", data: notification });
});

router.post("/trigger", (req, res) => {
  if (isPlaceholderSilo(req)) {
    return respondWithPlaceholder(res);
  }
  const parsed = NotificationTriggerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid trigger payload" });
  }
  const silo = req.silo!.silo;
  const createdAt = new Date().toISOString();
  let status: NotificationStatus = "sent";
  let metadata: Record<string, string> | undefined;

  if (parsed.data.channel === "sms") {
    const sms = req.silo!.services.sms.sendSms(parsed.data.recipient, parsed.data.message);
    metadata = { smsId: sms.id };
  } else if (parsed.data.channel === "email") {
    const email = req.silo!.services.emails.sendEmail({
      to: parsed.data.recipient,
      subject: parsed.data.subject ?? "Staff notification",
      body: parsed.data.message,
    });
    metadata = { emailId: email.id };
  } else {
    metadata = {
      pushId: randomUUID(),
      provider: "placeholder",
    };
  }

  const notification: Notification = {
    id: randomUUID(),
    channel: parsed.data.channel,
    recipient: parsed.data.recipient,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status,
    createdAt,
    metadata,
  };
  recordNotification(silo, notification);
  res.status(201).json({ message: "OK", data: notification });
});

export default router;
