"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
const openai_1 = __importDefault(require("openai"));
const client = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY || "test-openai-key",
});
async function generateEmbedding(text) {
    const response = await client.embeddings.create({
        model: process.env.OPENAI_EMBED_MODEL ?? process.env.AI_EMBED_MODEL ?? "text-embedding-3-small",
        input: text,
    });
    return response.data[0]?.embedding ?? [];
}
