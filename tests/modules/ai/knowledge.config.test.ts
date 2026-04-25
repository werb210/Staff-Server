import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

describe("knowledge.service.ts apiKey lookup", () => {
  const src = readFileSync("src/modules/ai/knowledge.service.ts", "utf8");

  it("uses config.openai.apiKey, not config.OPENAI_API_KEY", () => {
    expect(src).toContain("config.openai.apiKey");
    expect(/config\.OPENAI_API_KEY/.test(src)).toBe(false);
  });

  it("keeps the original on-disk FAQ path", () => {
    expect(src).toContain('path.resolve("storage/knowledge.json")');
  });

  it("keeps KnowledgeEntry as {title, content, createdAt}", () => {
    expect(src).toMatch(/KnowledgeEntry\s*=\s*\{\s*title:\s*string;\s*content:\s*string;\s*createdAt:\s*string;\s*\}/);
  });
});
