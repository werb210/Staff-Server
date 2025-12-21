"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EchoAIProvider = exports.AIEngine = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("../db");
const schema_1 = require("../db/schema");
class DrizzleAiLogWriter {
    async logInteraction(entry) {
        await db_1.db.insert(schema_1.aiTrainingChunks).values({
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
class AIEngine {
    provider;
    templatesDir;
    logWriter;
    constructor(provider, options = {}) {
        this.provider = provider;
        this.templatesDir = options.templatesDir ?? path_1.default.join(__dirname, "templates");
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
        const candidate = path_1.default.join(this.templatesDir, `${name}.txt`);
        if (fs_1.default.existsSync(candidate)) {
            return fs_1.default.readFileSync(candidate, "utf8");
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
exports.AIEngine = AIEngine;
class EchoAIProvider {
    name = "echo";
    async complete(input) {
        return `echo:${input.prompt}`;
    }
}
exports.EchoAIProvider = EchoAIProvider;
