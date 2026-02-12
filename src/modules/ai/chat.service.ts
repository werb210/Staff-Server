import { loadKnowledge } from "./knowledge.service";
import { withRetry } from "../../utils/retry";
import { canProceed, recordFailure, recordSuccess } from "../../utils/circuitBreaker";

export async function answerQuestion(question: string): Promise<string> {
  if (!canProceed()) {
    return "AI is temporarily unavailable. Please try again shortly.";
  }

  try {
    const response = await withRetry(async () => {
      const knowledge = loadKnowledge();
      const context = knowledge.map((entry) => entry.content).join("\n");
      return `AI Response:\n\n${question}\n\nContext length: ${context.length}`;
    });
    recordSuccess();
    return response;
  } catch (error) {
    recordFailure();
    throw error;
  }
}
