import OpenAI from "openai";

type ChatRole = "system" | "user" | "assistant";

export type AIMessage = {
  role: ChatRole;
  content: string;
};

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askAI(messages: AIMessage[]): Promise<string> {
  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    messages,
    temperature: 0.4,
  });

  return completion.choices[0]?.message?.content ?? "No response.";
}
