import OpenAI from "openai";
import { randomUUID } from "crypto";
import { z } from "zod";
import { pool } from "../../db";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const jsonObjectSchema = z.record(z.unknown());

export async function getPolicyConstraints(): Promise<string> {
  const { rows } = await pool.query<{ content: string }>(
    `select content from ai_policy_rules
     where active = true and rule_type = 'hard_constraint'`
  );

  return rows.map((row) => row.content).join("\n");
}

export async function retrieveContext(query: string): Promise<string> {
  const embedding = await client.embeddings.create({
    model: "text-embedding-3-small",
    input: query,
  });

  const vector = embedding.data[0]?.embedding ?? [];

  const { rows } = await pool.query<{ content: string }>(
    `select content
     from ai_knowledge
     order by embedding <-> $1
     limit 5`,
    [`[${vector.join(",")}]`]
  );

  return rows.map((row) => row.content).join("\n\n");
}

export async function generateAIResponse(sessionId: string, message: string): Promise<string> {
  const policy = await getPolicyConstraints();
  const context = await retrieveContext(message);

  const systemPrompt = `
You are Maya, a professional and friendly AI assistant for Boreal Financial.

HARD CONSTRAINTS:
${policy}

RULES:
- Never mention lender names.
- Always speak in ranges.
- Use "subject to underwriting".
- Output strictly valid JSON.
- No markdown.
- No extra commentary.
`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "system", content: `Knowledge:\n${context}` },
      { role: "user", content: message },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";

  const parsed = JSON.parse(content) as unknown;
  jsonObjectSchema.parse(parsed);
  const serializedContent = JSON.stringify(parsed);

  await pool.query(
    `insert into chat_messages (id, session_id, role, content)
     values ($1, $2, 'ai', $3)`,
    [randomUUID(), sessionId, serializedContent]
  );

  return serializedContent;
}
