import { AIEngine, EchoAIProvider, type AiLogWriter } from "../../ai/aiEngine";

describe("AIEngine", () => {
  it("logs and echoes prompts", async () => {
    const logs: any[] = [];
    const logWriter: AiLogWriter = {
      async logInteraction(entry) {
        logs.push(entry);
      },
    };
    const engine = new AIEngine(new EchoAIProvider(), { logWriter, templatesDir: "server/src/ai/templates" });

    const result = await engine.summarize({
      applicationId: "app-1",
      input: { content: "hello world" },
    });

    expect(result.response).toContain("echo:");
    expect(logs).toHaveLength(1);
    expect(logs[0].requestType).toBe("summarize");
  });
});
