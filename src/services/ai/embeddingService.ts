import { getOpenAIClient } from "./openai.service";

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAIClient().embeddings.create({
    model: process.env.OPENAI_EMBED_MODEL ?? process.env.AI_EMBED_MODEL ?? "text-embedding-3-small",
    input: text,
  });

  return response.data[0]?.embedding ?? [];
}
