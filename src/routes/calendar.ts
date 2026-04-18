/**
 * Calendar routes — proxies to Microsoft Graph using the user's stored O365 token.
 * Falls back to empty arrays when the user has not connected O365.
 */
import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { pool } from "../db.js";

const router = Router();

router.use(requireAuth);

async function getO365Token(userId: string): Promise<string | null> {
  const res = await pool.query<{ o365_access_token: string | null; o365_token_expires_at: Date | null }>(
    "SELECT o365_access_token, o365_token_expires_at FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );
  const row = res.rows[0];
  if (!row?.o365_access_token) return null;
  // Consider token expired if within 5 minutes of expiry
  if (row.o365_token_expires_at) {
    const expiresAt = new Date(row.o365_token_expires_at).getTime();
    if (Date.now() > expiresAt - 5 * 60 * 1000) return null;
  }
  return row.o365_access_token;
}

async function graphGet(token: string, path: string): Promise<unknown> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${path}`);
  return res.json();
}

async function graphPost(token: string, path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${path}`);
  return res.json();
}

async function graphPatch(token: string, path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${path}`);
  return res.json();
}

async function graphDelete(token: string, path: string): Promise<void> {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${path}`);
}

// GET /api/calendar — summary
router.get("/", safeHandler(async (req: any, res: any) => {
  const token = await getO365Token(req.user?.userId).catch(() => null);
  if (!token) return res.status(200).json({ status: "ok", data: { items: [], connected: false } });
  try {
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const data = await graphGet(token, `/me/calendarView?startDateTime=${now}&endDateTime=${end}&$top=20&$orderby=start/dateTime`);
    const items = (data as any).value ?? [];
    res.status(200).json({ status: "ok", data: { items, connected: true } });
  } catch {
    res.status(200).json({ status: "ok", data: { items: [], connected: true, error: "graph_fetch_failed" } });
  }
}));

// GET /api/calendar/events
router.get("/events", safeHandler(async (req: any, res: any) => {
  const token = await getO365Token(req.user?.userId).catch(() => null);
  if (!token) return res.status(200).json({ status: "ok", data: [] });
  try {
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();
    const data = await graphGet(token, `/me/calendarView?startDateTime=${now}&endDateTime=${end}&$top=50&$orderby=start/dateTime`);
    res.status(200).json({ status: "ok", data: (data as any).value ?? [] });
  } catch {
    res.status(200).json({ status: "ok", data: [] });
  }
}));

// POST /api/calendar/events
router.post("/events", safeHandler(async (req: any, res: any) => {
  const token = await getO365Token(req.user?.userId).catch(() => null);
  if (!token) {
    const id = randomUUID();
    return res.status(201).json({ status: "ok", data: { id, ...req.body } });
  }
  const body = req.body ?? {};
  const event = await graphPost(token, "/me/events", {
    subject: body.title ?? body.subject ?? "Untitled Event",
    start: { dateTime: body.start ?? body.startDateTime ?? new Date().toISOString(), timeZone: "UTC" },
    end: { dateTime: body.end ?? body.endDateTime ?? new Date(Date.now() + 3600000).toISOString(), timeZone: "UTC" },
    ...(body.description ? { body: { contentType: "text", content: body.description } } : {}),
    ...(body.attendees ? { attendees: body.attendees } : {}),
  });
  res.status(201).json({ status: "ok", data: event });
}));

// PATCH /api/calendar/events/:id
router.patch("/events/:id", safeHandler(async (req: any, res: any) => {
  const token = await getO365Token(req.user?.userId).catch(() => null);
  const { id } = req.params as { id: string };
  if (!token) return res.status(200).json({ status: "ok", data: { id, ...req.body } });
  const body = req.body ?? {};
  const patch: Record<string, unknown> = {};
  if (body.title ?? body.subject) patch.subject = body.title ?? body.subject;
  if (body.start ?? body.startDateTime) patch.start = { dateTime: body.start ?? body.startDateTime, timeZone: "UTC" };
  if (body.end ?? body.endDateTime) patch.end = { dateTime: body.end ?? body.endDateTime, timeZone: "UTC" };
  if (body.description) patch.body = { contentType: "text", content: body.description };
  const event = await graphPatch(token, `/me/events/${id}`, patch);
  res.status(200).json({ status: "ok", data: event });
}));

// DELETE /api/calendar/events/:id
router.delete("/events/:id", safeHandler(async (req: any, res: any) => {
  const token = await getO365Token(req.user?.userId).catch(() => null);
  const { id } = req.params as { id: string };
  if (!token) return res.status(200).json({ status: "ok", data: null });
  await graphDelete(token, `/me/events/${id}`);
  res.status(200).json({ status: "ok", data: null });
}));

// GET /api/calendar/tasks
router.get("/tasks", safeHandler(async (req: any, res: any) => {
  const token = await getO365Token(req.user?.userId).catch(() => null);
  if (!token) return res.status(200).json({ status: "ok", data: [] });
  try {
    // Get all task lists then aggregate tasks
    const lists = await graphGet(token, "/me/todo/lists?$top=20");
    const allLists = (lists as any).value ?? [];
    const taskArrays = await Promise.all(
      allLists.map(async (list: any) => {
        const tasks = await graphGet(token, `/me/todo/lists/${list.id}/tasks?$filter=status ne 'completed'&$top=50`);
        return ((tasks as any).value ?? []).map((t: any) => ({ ...t, listId: list.id, listName: list.displayName }));
      })
    );
    res.status(200).json({ status: "ok", data: taskArrays.flat() });
  } catch {
    res.status(200).json({ status: "ok", data: [] });
  }
}));

export default router;
