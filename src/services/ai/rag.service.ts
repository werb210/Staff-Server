import { pool } from "../../db";
import { getOpenAIClient } from "./openai.service";

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export async function embedText(text: string): Promise<number[]> {
  const response = await getOpenAIClient().embeddings.create({
    model: process.env.OPENAI_EMBED_MODEL ?? "text-embedding-3-small",
    input: text,
  });

  return response.data[0]?.embedding ?? [];
}

export async function searchRelevantDocs(query: string): Promise<string[]> {
  const embedding = await embedText(query);

  const result = await pool.query<{ content: string }>(
    `
    select content
    from ai_embeddings
    where embedding is not null
    order by embedding <-> $1::vector
    limit 5
    `,
    [toVectorLiteral(embedding)]
  );

  return result.rows.map((row) => row.content);
}
