import OpenAI from "openai";
import { db } from "../../db";
import { retrieveRelevantContext } from "./retrievalService";
import { applyAiGuardrails, CAPITAL_SOURCE_PHRASE } from "../../modules/ai/guardrails";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type RuleRow = {
  rule_key: string;
  rule_value: string;
};

async function loadSystemRules(): Promise<string> {
  const { rows } = await db.query<RuleRow>(
    `
    select rule_key, rule_value
    from ai_system_rules
    order by rule_key asc
    `
  );

  if (rows.length === 0) {
    return [
      "- Never mention lender names.",
      "- Always show ranges only.",
      "- Never give underwriting guarantees.",
      "- Never mention startup funding as available.",
      "- Use professional and friendly tone.",
      `- Say: "${CAPITAL_SOURCE_PHRASE}"`,
    ].join("\n");
  }

  return rows.map((row) => `- ${row.rule_key}: ${row.rule_value}`).join("\n");
}

export async function generateAIResponse(userMessage: string): Promise<string> {
  const [context, rules] = await Promise.all([
    retrieveRelevantContext(userMessage),
    loadSystemRules(),
  ]);

  const systemName = process.env.AI_SYSTEM_NAME ?? "Maya";

  const systemPrompt = `
You are ${systemName}, Boreal Financial's AI assistant.

Rules:
${rules}

Knowledge:
${context}
`;

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? process.env.AI_MODEL ?? "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  return applyAiGuardrails(response.choices[0]?.message?.content ?? "");
}
