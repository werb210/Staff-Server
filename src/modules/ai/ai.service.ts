import OpenAI from "openai";

type AiReply = {
  reply: string;
  askIntakeQuestions?: boolean;
};

const LENDER_LANGUAGE = "We have lenders across different capital types, including Institutional lenders, Banking, and Private Capital sources as well as our own funding offerings.";

const SYSTEM_PROMPT = [
  "You are a financing assistant for Boreal Financial.",
  "Output only valid JSON with keys: reply (string), askIntakeQuestions (boolean).",
  "Never name lenders.",
  LENDER_LANGUAGE,
  "Use range-based language for all rates, pricing, and limits.",
  "Never guarantee approvals.",
  "Never make fixed pricing promises.",
  "If user asks qualification-related questions, ask intake questions before recommendations.",
].join("\n");

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function generateAIResponse(_sessionId: string, message: string): Promise<string> {
  if (!client) {
    return JSON.stringify({
      reply: `${LENDER_LANGUAGE} To guide qualification, could you share time in business, monthly revenue range, and existing obligations?`,
      askIntakeQuestions: true,
    } satisfies AiReply);
  }

  const response = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4.1-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: message },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as AiReply;

  if (typeof parsed.reply !== "string") {
    throw new Error("AI response format invalid: missing reply.");
  }

  return JSON.stringify({
    reply: parsed.reply,
    askIntakeQuestions: Boolean(parsed.askIntakeQuestions),
  } satisfies AiReply);
}
