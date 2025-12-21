import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db";
import { aiTrainingChunks } from "../db/schema";

export type AIRequestType = "summarize" | "extract" | "rewrite" | "credit-summary";

export interface AIProvider {
  name: string;
  complete(input: { prompt: string; metadata?: Record<string, any> }): Promise<string>;
}

export interface AiLogWriter {
  logInteraction(entry: {
    applicationId: string;
    documentVersionId?: string;
    userId?: string;
    provider: string;
    requestType: AIRequestType;
    prompt: string;
    response: string;
    metadata?: Record<string, any>;
  }): Promise<void>;
}

class DrizzleAiLogWriter implements AiLogWriter {
  async logInteraction(entry: {
    applicationId: string;
    documentVersionId?: string;
    userId?: string;
    provider: string;
    requestType: AIRequestType;
    prompt: string;
    response: string;
    metadata?: Record<string, any>;
  }) {
    await db.insert(aiTrainingChunks).values({
      applicationId: entry.applicationId,
      documentVersionId: entry.documentVersionId ?? null,
      userId: entry.userId ?? null,
      provider: entry.provider,
      requestType: entry.requestType,
      prompt: entry.prompt,
      response: entry.response,
      metadata: entry.metadata ?? {},
    });
  }
}

export interface AIEngineOptions {
  templatesDir?: string;
  logWriter?: AiLogWriter;
}

export class AIEngine {
  private provider: AIProvider;
  private templatesDir: string;
  private logWriter: AiLogWriter;

  constructor(provider: AIProvider, options: AIEngineOptions = {}) {
    this.provider = provider;
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    this.templatesDir = options.templatesDir ?? path.join(currentDir, "templates");
    this.logWriter = options.logWriter ?? new DrizzleAiLogWriter();
  }

  async summarize(payload: {
    applicationId: string;
    userId?: string;
    template?: string;
    input: Record<string, any>;
    documentVersionId?: string;
  }) {
    return this.run("summarize", payload);
  }

  async extract(payload: {
    applicationId: string;
    userId?: string;
    template?: string;
    input: Record<string, any>;
    documentVersionId?: string;
  }) {
    return this.run("extract", payload);
  }

  async rewrite(payload: {
    applicationId: string;
    userId?: string;
    template?: string;
    input: Record<string, any>;
    documentVersionId?: string;
  }) {
    return this.run("rewrite", payload);
  }

  async creditSummary(payload: {
    applicationId: string;
    userId?: string;
    template?: string;
    input: Record<string, any>;
    documentVersionId?: string;
  }) {
    return this.run("credit-summary", payload);
  }

  private async run(
    requestType: AIRequestType,
    payload: {
      applicationId: string;
      userId?: string;
      template?: string;
      input: Record<string, any>;
      documentVersionId?: string;
    },
  ) {
    const promptTemplate = payload.template
      ? payload.template
      : this.loadTemplate(requestType === "credit-summary" ? "credit-summary" : "generic");
    const prompt = this.interpolateTemplate(promptTemplate, payload.input);
    const response = await this.provider.complete({ prompt, metadata: { requestType } });

    await this.logWriter.logInteraction({
      applicationId: payload.applicationId,
      documentVersionId: payload.documentVersionId,
      userId: payload.userId,
      provider: this.provider.name,
      requestType,
      prompt,
      response,
      metadata: payload.input,
    });

    return { prompt, response };
  }

  private loadTemplate(name: string) {
    const candidate = path.join(this.templatesDir, `${name}.txt`);
    if (fs.existsSync(candidate)) {
      return fs.readFileSync(candidate, "utf8");
    }
    return "Provide a helpful response based on the provided context: {{content}}";
  }

  private interpolateTemplate(template: string, input: Record<string, any>) {
    return template.replace(/{{(.*?)}}/g, (_match, key) => {
      const trimmed = String(key).trim();
      const value = input[trimmed];
      return typeof value === "string" ? value : JSON.stringify(value ?? "");
    });
  }
}

export class EchoAIProvider implements AIProvider {
  name = "echo";
  async complete(input: { prompt: string; metadata?: Record<string, any> }) {
    return `echo:${input.prompt}`;
  }
}
