"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scorePreApplication = scorePreApplication;
const openai_1 = __importDefault(require("openai"));
function getAzureClient() {
    if (!process.env.AZURE_OPENAI_KEY || !process.env.AZURE_OPENAI_ENDPOINT) {
        throw new Error("Azure OpenAI credentials are not configured.");
    }
    return new openai_1.default({
        apiKey: process.env.AZURE_OPENAI_KEY,
        baseURL: process.env.AZURE_OPENAI_ENDPOINT,
    });
}
async function scorePreApplication(data) {
    if (!process.env.AZURE_OPENAI_DEPLOYMENT) {
        throw new Error("AZURE_OPENAI_DEPLOYMENT is not configured.");
    }
    const prompt = `
Evaluate this business for credit readiness.
Return a score from 1-10 and a short reason.

${JSON.stringify(data)}
`;
    const openai = getAzureClient();
    const response = await openai.chat.completions.create({
        model: process.env.AZURE_OPENAI_DEPLOYMENT,
        messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? null;
}
