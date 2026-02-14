import { Request, Response } from "express";
import { v4 as uuid } from "uuid";
import { pool } from "../db";
import { openai } from "../services/ai/openai.service";
import { retrieveContext } from "../modules/ai/knowledge.service";

const SYSTEM_PROMPT = `
You are Maya, AI assistant for Boreal Financial.

Rules:
- Never name lenders.
- Always speak in ranges.
- Do not guarantee approval.
- Use underwriting language.
- Capital sources include institutional, banking, private capital and internal programs.
- If startup funding requested, inform it is coming soon and collect contact info.
`;

type ChatRequestBody = {
  sessionId?: string;
  message?: string;
  context?: string;
};

async function createSession(context: string): Promise<{ id: string }> {
  const id = uuid();

  await pool.query(
    `insert into ai_sessions (id, visitor_id, context, status, source)
     values ($1, $2, $3, 'active', 'website')`,
    [id, uuid(), context]
  );

  return { id };
}

async function saveMessage(sessionId: string, role: string, content: string): Promise<void> {
  await pool.query(
    `insert into ai_messages (id, session_id, role, content)
     values ($1, $2, $3, $4)`,
    [uuid(), sessionId, role, content]
  );
}

export async function chat(req: Request, res: Response): Promise<void> {
  const { sessionId, message, context } = req.body as ChatRequestBody;

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const session = sessionId ? { id: sessionId } : await createSession(context ?? "website_chat");

  await saveMessage(session.id, "user", message);

  const contextText = await retrieveContext(pool, message);

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: `Context:\n${contextText}` },
      { role: "user", content: message },
    ],
  });

  const reply = completion.choices[0]?.message?.content ?? "No response.";

  await saveMessage(session.id, "assistant", reply);

  res.json({ sessionId: session.id, reply });
}

export async function escalate(req: Request, res: Response): Promise<void> {
  const { sessionId } = req.body as { sessionId?: string };

  if (!sessionId) {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  await pool.query(`update ai_sessions set status = 'transferred' where id = $1`, [sessionId]);

  res.json({ success: true });
}

export async function closeSession(req: Request, res: Response): Promise<void> {
  const sessionId = req.params.sessionId;

  const transcriptResult = await pool.query<{ role: string; content: string }>(
    `select role, content from ai_messages where session_id = $1 order by created_at`,
    [sessionId]
  );

  const sessionResult = await pool.query<{
    company_name: string | null;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    startup_interest_tags: unknown;
  }>(
    `select company_name, full_name, email, phone, startup_interest_tags
     from ai_sessions
     where id = $1`,
    [sessionId]
  );

  await pool.query(`update ai_sessions set status = 'closed' where id = $1`, [sessionId]);

  const session = sessionResult.rows[0];
  if (session) {
    await pool.query(
      `insert into crm_leads (id, company_name, full_name, phone, email, source, notes, tags)
       values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
      [
        uuid(),
        session.company_name,
        session.full_name,
        session.phone,
        session.email,
        "ai_session",
        JSON.stringify({ transcript: transcriptResult.rows }),
        JSON.stringify(session.startup_interest_tags ?? ["ai_session_closed"]),
      ]
    );
  }

  res.json({ success: true });
}

export async function createContinuation(req: Request, res: Response): Promise<void> {
  const { contactData } = req.body as { contactData?: Record<string, unknown> };

  if (!contactData) {
    res.status(400).json({ error: "contactData is required" });
    return;
  }

  const token = uuid();

  await pool.query(
    `insert into application_continuations (token, prefill_json, status)
     values ($1, $2::jsonb, 'draft')`,
    [token, JSON.stringify(contactData)]
  );

  res.json({ continueUrl: `https://client.boreal.financial/continue/${token}` });
}

export async function tagStartupInterest(req: Request, res: Response): Promise<void> {
  const { sessionId, tags } = req.body as { sessionId?: string; tags?: string[] };

  if (!sessionId || !Array.isArray(tags)) {
    res.status(400).json({ error: "sessionId and tags are required" });
    return;
  }

  try {
    await pool.query(
      `update ai_sessions set startup_interest_tags = $2::jsonb where id = $1`,
      [sessionId, JSON.stringify(tags)]
    );
  } catch {
    try {
      await saveMessage(sessionId, "system", `startup_interest:${tags.join(",")}`);
    } catch {
      // Legacy schemas may not support system role in ai_messages.
    }
    res.json({ success: true, tags, persistedToSession: false });
    return;
  }

  try {
    await saveMessage(sessionId, "system", `startup_interest:${tags.join(",")}`);
  } catch {
    // Legacy schemas may not support system role in ai_messages.
  }

  res.json({ success: true, tags, persistedToSession: true });
}
