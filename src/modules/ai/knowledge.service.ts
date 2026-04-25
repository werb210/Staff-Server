import fs from "node:fs";
import path from "node:path";
import OpenAI from "openai";
import { v4 as uuid } from "uuid";
import { config } from "../../config/index.js";

export type KnowledgeEntry = {
  title: string;
  content: string;
  createdAt: string;
};

const KNOWLEDGE_PATH = path.resolve("storage/knowledge.json");

function ensureStorageDir(): void {
  const dir = path.dirname(KNOWLEDGE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(KNOWLEDGE_PATH)) fs.writeFileSync(KNOWLEDGE_PATH, "[]", "utf8");
}

let openaiClient: OpenAI | null = null;

function fetchOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = config.openai.apiKey;
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

// Postgres TEXT columns reject 0x00 (UTF-8 encoding error 22021).
// Some .docx / binary uploads slip null bytes through readTextPreview.
// Also strip lone surrogates and other C0 control chars except \t,\n,\r.
function sanitizeContentForStorage(input: string): string {
  if (!input) return input;
  return input
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[\uD800-\uDFFF]/g, "");
}

export async function embedAndStore(
  db: Queryable,
  content: string,
  sourceType: string,
  sourceId?: string | null,
  title?: string | null,
): Promise<void> {
  const safeTitle = (title && title.trim()) || deriveTitle(content, sourceType);
  const safeContent = sanitizeContentForStorage(content);

  const insertNoEmbedding = (tag: string) => db.query(
    `insert into ai_knowledge (id, title, source_type, source_id, content, embedding)
     values ($1, $2, $3, $4, $5, NULL)`,
    [uuid(), safeTitle, `${sourceType}:${tag}`, sourceId ?? null, safeContent],
  );

  if (!config.openai.apiKey) {
    await insertNoEmbedding("no-embed");
    const err = new Error("OPENAI_API_KEY not configured. Stored without embedding.");
    (err as { code?: string }).code = "openai_not_configured";
    throw err;
  }

  const embedInput = safeContent.length > EMBED_INPUT_MAX_CHARS
    ? safeContent.slice(0, EMBED_INPUT_MAX_CHARS)
    : safeContent;

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
    [uuid(), safeTitle, sourceType, sourceId ?? null, safeContent, toVectorLiteral(vector)],
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
