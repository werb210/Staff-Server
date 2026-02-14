export type AiContext = "website" | "client" | "portal";

export interface AiSession {
  id: string;
  context: AiContext;
  escalated: boolean;
  createdAt: Date;
}

export interface AiMessage {
  sessionId: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: Date;
}
