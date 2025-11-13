import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthenticatedUser } from "../services/authService.js";

import {
  getThreads as getSmsThreads,
  getThread as getSmsThread,
  sendSMS as dispatchSms,
} from "../services/smsService.js";

import {
  getCalls as fetchCalls,
  initiateCall as startCall,
  endCall as finishCall,
  CallNotFoundError,
} from "../services/callsService.js";

import {
  sendEmail as dispatchEmail,
  emailService,
} from "../services/emailService.js";

import {
  getTemplates as fetchTemplates,
  createTemplate as persistTemplate,
  updateTemplate as persistTemplateUpdate,
  deleteTemplate as removeTemplate,
  TemplateNotFoundError,
} from "../services/templateService.js";

import { logError } from "../utils/logger.js";

/* -------------------- Validation Schemas -------------------- */

const smsSendSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().min(5),
  body: z.string().min(1),
  from: z.string().min(5).optional(),
  metadata: z.record(z.any()).optional(),
});

const callInitiateSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().min(5),
  from: z.string().min(5).optional(),
  context: z.string().optional(),
});

const callEndSchema = z.object({
  callId: z.string().uuid(),
});

const emailSendSchema = z.object({
  contactId: z.string().uuid(),
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  sendAsSystem: z.boolean().optional(),
});

const templateCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["sms", "email"]),
  content: z.string().min(1),
});

const templateUpdateSchema = templateCreateSchema.partial().refine(
  (v) => Object.keys(v).length > 0,
  { message: "At least one field is required" }
);

/* -------------------- Helpers -------------------- */

const extractUser = (req: Request): AuthenticatedUser | undefined =>
  (req as Request & { user?: AuthenticatedUser }).user;

const sendValidationError = (res: Response, message: string) =>
  res.status(400).json({ message });

/* -------------------- SMS -------------------- */

export const getSMSThreads = async (_req: Request, res: Response) => {
  const threads = await getSmsThreads();
  return res.json({ message: "OK", data: threads });
};

export const getSMSForContact = async (req: Request, res: Response) => {
  const parsed = z.string().uuid().safeParse(req.params.contactId);
  if (!parsed.success) return sendValidationError(res, "Invalid contact id");

  const messages = await getSmsThread(parsed.data);
  return res.json({ message: "OK", data: messages });
};

export const sendSMS = async (req: Request, res: Response) => {
  const parsed = smsSendSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, "Invalid SMS payload");

  const user = extractUser(req);

  try {
    const message = await dispatchSms(parsed.data.contactId, {
      to: parsed.data.to,
      from: parsed.data.from,
      body: parsed.data.body,
      sentBy: user?.id,
      metadata: parsed.data.metadata,
    });

    return res.status(201).json({ message: "OK", data: message });
  } catch (err) {
    logError("Failed to send SMS", err);
    return res.status(500).json({ message: "Failed to send SMS" });
  }
};

/* -------------------- Calls -------------------- */

export const getCalls = async (_req: Request, res: Response) => {
  const calls = await fetchCalls();
  return res.json({ message: "OK", data: calls });
};

export const initiateCall = async (req: Request, res: Response) => {
  const parsed = callInitiateSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, "Invalid call payload");

  const user = extractUser(req);

  try {
    const call = await startCall(parsed.data.contactId, {
      to: parsed.data.to,
      from: parsed.data.from,
      initiatedBy: user?.id,
      context: parsed.data.context,
    });

    return res.status(201).json({ message: "OK", data: call });
  } catch (err) {
    logError("Failed to initiate call", err);
    return res.status(500).json({ message: "Failed to initiate call" });
  }
};

export const endCall = async (req: Request, res: Response) => {
  const parsed = callEndSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, "Invalid call id");

  try {
    const call = await finishCall(parsed.data.callId);
    return res.json({ message: "OK", data: call });
  } catch (err) {
    if (err instanceof CallNotFoundError) {
      return res.status(404).json({ message: "Call not found" });
    }
    logError("Failed to end call", err);
    return res.status(500).json({ message: "Failed to end call" });
  }
};

/* -------------------- Email -------------------- */

export const getEmailThreads = async (_req: Request, res: Response) => {
  const threads = emailService.listThreads();
  return res.json({ message: "OK", data: threads });
};

export const sendEmail = async (req: Request, res: Response) => {
  const parsed = emailSendSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, "Invalid email payload");

  const user = extractUser(req);

  try {
    const message = await dispatchEmail(
      parsed.data.contactId,
      parsed.data.subject,
      parsed.data.body,
      {
        to: parsed.data.to,
        userEmail: parsed.data.sendAsSystem ? undefined : user?.email,
        sendAsSystem: parsed.data.sendAsSystem ?? false,
        sentBy: user?.id,
      }
    );

    return res.status(201).json({ message: "OK", data: message });
  } catch (err) {
    logError("Failed to send email", err);
    return res.status(500).json({ message: "Failed to send email" });
  }
};

/* -------------------- Templates -------------------- */

export const getTemplates = async (_req: Request, res: Response) => {
  const templates = await fetchTemplates();
  return res.json({ message: "OK", data: templates });
};

export const createTemplate = async (req: Request, res: Response) => {
  const parsed = templateCreateSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, "Invalid template payload");

  const user = extractUser(req);
  const template = await persistTemplate({ ...parsed.data, createdBy: user?.id });

  return res.status(201).json({ message: "OK", data: template });
};

export const updateTemplate = async (req: Request, res: Response) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return sendValidationError(res, "Invalid template id");

  const parsed = templateUpdateSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, "Invalid template payload");

  const user = extractUser(req);

  try {
    const template = await persistTemplateUpdate(id.data, {
      ...parsed.data,
      updatedBy: user?.id,
    });

    return res.json({ message: "OK", data: template });
  } catch (err) {
    if (err instanceof TemplateNotFoundError) {
      return res.status(404).json({ message: "Template not found" });
    }
    logError("Failed to update template", err);
    return res.status(500).json({ message: "Failed to update template" });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  const id = z.string().uuid().safeParse(req.params.id);
  if (!id.success) return sendValidationError(res, "Invalid template id");

  try {
    await removeTemplate(id.data);
    return res.status(204).send();
  } catch (err) {
    if (err instanceof TemplateNotFoundError) {
      return res.status(404).json({ message: "Template not found" });
    }
    logError("Failed to delete template", err);
    return res.status(500).json({ message: "Failed to delete template" });
  }
};
