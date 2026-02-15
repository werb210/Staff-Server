import OpenAI from "openai";

type ChatRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: ChatRole;
  content: string;
};

let openAiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for AI chat operations.");
  }
  if (!openAiClient) {
    openAiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openAiClient;
}

export async function askAI(messages: AIMessage[]): Promise<string> {
  const completion = await getClient().chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages,
    temperature: 0.4,
  });

  return completion.choices[0]?.message?.content ?? "No response.";
}
