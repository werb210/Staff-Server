import type { Request, Response } from "express";

import type { JwtUserPayload } from "../auth/authService.js";
import { smsService } from "../services/smsService.js";
import { startCall, listCalls } from "../services/callsService.js";
import { sendEmail, listEmails } from "../services/emailService.js";

const getUser = (req: Request): JwtUserPayload | null => {
  const user = req.user as JwtUserPayload | undefined;
  return user ?? null;
};

const handleError = (res: Response, error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unable to complete request";
  return res.status(400).json({ error: message });
};

/* ---------------- SMS ---------------- */
export async function smsSend(req: Request, res: Response) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { contactId, to, body } = req.body ?? {};

  const destination = typeof to === "string" ? to : contactId;

  if (typeof destination !== "string" || destination.trim().length === 0) {
    return res.status(400).json({ error: "Recipient phone number is required" });
  }

  if (typeof body !== "string" || body.trim().length === 0) {
    return res.status(400).json({ error: "Message body is required" });
  }

  try {
    const message = await smsService.send(destination, body);
    return res.json(message);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function smsThreads(req: Request, res: Response) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    return res.json({ threads: [] });
  } catch (error) {
    return handleError(res, error);
  }
}

/* ---------------- CALLS --------------- */
export async function callStart(req: Request, res: Response) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { contactId } = req.body ?? {};
  if (typeof contactId !== "string") {
    return res.status(400).json({ error: "contactId is required" });
  }

  try {
    const call = await startCall(contactId, user);
    return res.json(call);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function callList(req: Request, res: Response) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const calls = await listCalls(user);
    return res.json(calls);
  } catch (error) {
    return handleError(res, error);
  }
}

/* ---------------- EMAIL ---------------- */
export async function emailSend(req: Request, res: Response) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { contactId, subject, body } = req.body ?? {};

  if (typeof contactId !== "string") {
    return res.status(400).json({ error: "contactId is required" });
  }

  if (typeof subject !== "string" || subject.trim().length === 0) {
    return res.status(400).json({ error: "Email subject is required" });
  }

  if (typeof body !== "string" || body.trim().length === 0) {
    return res.status(400).json({ error: "Email body is required" });
  }

  try {
    const email = await sendEmail(contactId, user, subject, body);
    return res.json(email);
  } catch (error) {
    return handleError(res, error);
  }
}

export async function emailList(req: Request, res: Response) {
  const user = getUser(req);
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const emails = await listEmails(user);
    return res.json(emails);
  } catch (error) {
    return handleError(res, error);
  }
}
