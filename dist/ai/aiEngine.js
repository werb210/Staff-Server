import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "../db";
import { aiTrainingChunks } from "../db/schema";
class DrizzleAiLogWriter {
    async logInteraction(entry) {
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
export class AIEngine {
    provider;
    templatesDir;
    logWriter;
    constructor(provider, options = {}) {
        this.provider = provider;
        const currentDir = path.dirname(fileURLToPath(import.meta.url));
        this.templatesDir = options.templatesDir ?? path.join(currentDir, "templates");
        this.logWriter = options.logWriter ?? new DrizzleAiLogWriter();
    }
    async summarize(payload) {
        return this.run("summarize", payload);
    }
    async extract(payload) {
        return this.run("extract", payload);
    }
    async rewrite(payload) {
        return this.run("rewrite", payload);
    }
    async creditSummary(payload) {
        return this.run("credit-summary", payload);
    }
    async run(requestType, payload) {
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
    loadTemplate(name) {
        const candidate = path.join(this.templatesDir, `${name}.txt`);
        if (fs.existsSync(candidate)) {
            return fs.readFileSync(candidate, "utf8");
        }
        return "Provide a helpful response based on the provided context: {{content}}";
    }
    interpolateTemplate(template, input) {
        return template.replace(/{{(.*?)}}/g, (_match, key) => {
            const trimmed = String(key).trim();
            const value = input[trimmed];
            return typeof value === "string" ? value : JSON.stringify(value ?? "");
        });
    }
}
export class EchoAIProvider {
    name = "echo";
    async complete(input) {
        return `echo:${input.prompt}`;
    }
}
