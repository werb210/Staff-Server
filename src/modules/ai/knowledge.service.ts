import fs from "node:fs";
import path from "node:path";

type KnowledgeEntry = {
  title: string;
  content: string;
  createdAt: string;
};

const KNOWLEDGE_PATH = path.resolve("storage/knowledge.json");

function ensureStorageDir(): void {
  fs.mkdirSync(path.dirname(KNOWLEDGE_PATH), { recursive: true });
}

export function loadKnowledge(): KnowledgeEntry[] {
  if (!fs.existsSync(KNOWLEDGE_PATH)) return [];
  const raw = fs.readFileSync(KNOWLEDGE_PATH, "utf8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as KnowledgeEntry[];
}

export function saveKnowledge(entries: KnowledgeEntry[]): void {
  ensureStorageDir();
  fs.writeFileSync(KNOWLEDGE_PATH, JSON.stringify(entries, null, 2), "utf8");
}

export type { KnowledgeEntry };
