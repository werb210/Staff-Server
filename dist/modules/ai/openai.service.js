"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askAI = askAI;
const openai_1 = __importDefault(require("openai"));
let client = null;
function getClient() {
    if (client)
        return client;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("OPENAI_API_KEY is required for AI chat.");
    }
    client = new openai_1.default({ apiKey });
    return client;
}
async function askAI(messages) {
    const completion = await getClient().chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
        messages,
        temperature: 0.4,
    });
    return completion.choices[0]?.message?.content ?? "No response.";
}
