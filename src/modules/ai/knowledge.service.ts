import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import { config } from "../../config/index.js";

export type KnowledgeEntry = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
  source: "manual" | "imported";
};

const KNOWLEDGE_PATH = path.join(process.cwd(), "data", "knowledge.json");

function ensureStorageDir(): void {
  const dir = path.dirname(KNOWLEDGE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(KNOWLEDGE_PATH)) fs.writeFileSync(KNOWLEDGE_PATH, "[]", "utf8");
}

let openaiClient: OpenAI | null = null;

function fetchOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = config.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error("OPENAI_API_KEY not configured.");
    (err as { code?: string }).code = "openai_not_configured";
    throw err;
  }
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(",")}]`;
}

export function loadKnowledge(): KnowledgeEntry[] {
  ensureStorageDir();
  const raw = fs.readFileSync(KNOWLEDGE_PATH, "utf8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as KnowledgeEntry[];
}

export function saveKnowledge(entries: KnowledgeEntry[]): void {
  ensureStorageDir();
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(entries, null, 2), "utf8");
}

type Queryable = {
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
};

// text-embedding-3-small caps input at ~8192 tokens. Roughly 4 chars
// per token on English prose, so 30,000 chars stays well under.
const EMBED_INPUT_MAX_CHARS = 30_000;

function deriveTitle(content: string, fallback?: string | null): string {
  const trimmed = (content ?? "").trim();
  if (trimmed) {
    const firstLine = trimmed.split(/\r?\n/, 1)[0]!.trim();
    if (firstLine) return firstLine.slice(0, 200);
    return trimmed.slice(0, 200);
  }
  return (fallback ?? "Untitled").slice(0, 200);
}

export async function embedAndStore(
  db: Queryable,
  content: string,
  sourceType: string,
  sourceId?: string | null,
  title?: string | null,
): Promise<void> {
  const safeTitle = (title && title.trim()) || deriveTitle(content, sourceType);

  const insertNoEmbedding = (tag: string) => db.query(
    `insert into ai_knowledge (id, title, source_type, source_id, content, embedding)
     values ($1, $2, $3, $4, $5, NULL)`,
    [uuid(), safeTitle, `${sourceType}:${tag}`, sourceId ?? null, content],
  );

  if (!process.env.OPENAI_API_KEY) {
    await insertNoEmbedding("no-embed");
    const err = new Error("OPENAI_API_KEY not configured. Stored without embedding.");
    (err as { code?: string }).code = "openai_not_configured";
    throw err;
  }

  const embedInput = content.length > EMBED_INPUT_MAX_CHARS
    ? content.slice(0, EMBED_INPUT_MAX_CHARS)
    : content;

  let vector: number[] | undefined;
  try {
    const embedding = await fetchOpenAIClient().embeddings.create({
      model: "text-embedding-3-small",
      input: embedInput,
    });
    vector = embedding.data[0]?.embedding;
  } catch (e) {
    await insertNoEmbedding("embed-failed");
    const err = new Error("Embedding service unavailable. Saved without index.");
    (err as { code?: string; cause?: unknown }).code = "embedding_failed";
    (err as { cause?: unknown }).cause = e;
    throw err;
  }

  if (!vector) {
    await insertNoEmbedding("no-vector");
    const err = new Error("No embedding vector returned. Saved without index.");
    (err as { code?: string }).code = "no_vector";
    throw err;
  }

  await db.query(
    `insert into ai_knowledge (id, title, source_type, source_id, content, embedding)
     values ($1, $2, $3, $4, $5, $6::vector)`,
    [uuid(), safeTitle, sourceType, sourceId ?? null, content, toVectorLiteral(vector)],
  );
}

export async function retrieveContext(
  db: Queryable,
  question: string,
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";
  const embedInput = question.length > EMBED_INPUT_MAX_CHARS
    ? question.slice(0, EMBED_INPUT_MAX_CHARS)
    : question;

  let vector: number[] | undefined;
  try {
    const embedding = await fetchOpenAIClient().embeddings.create({
      model: "text-embedding-3-small",
      input: embedInput,
    });
    vector = embedding.data[0]?.embedding;
  } catch {
    return "";
  }
  if (!vector) return "";

  const result = await db.query<{ content: string }>(
    `select content from ai_knowledge
     where embedding is not null
     order by embedding <-> $1::vector
     limit 6`,
    [toVectorLiteral(vector)],
  );
  return result.rows.map((r) => r.content).join("\n\n");
}
