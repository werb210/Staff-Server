export const AI_DOCUMENT_CATEGORIES = [
  "product",
  "lender",
  "underwriting",
  "process",
] as const;

export const CHAT_SESSION_USER_TYPES = ["client", "guest", "portal"] as const;
export const CHAT_SESSION_STATUSES = ["active", "escalated", "closed"] as const;
export const CHAT_MESSAGE_ROLES = ["user", "ai", "staff"] as const;
export const ISSUE_REPORT_STATUSES = ["open", "in_progress", "resolved"] as const;

export type AiDocumentCategory = (typeof AI_DOCUMENT_CATEGORIES)[number];
export type ChatSessionUserType = (typeof CHAT_SESSION_USER_TYPES)[number];
export type ChatSessionStatus = (typeof CHAT_SESSION_STATUSES)[number];
export type ChatMessageRole = (typeof CHAT_MESSAGE_ROLES)[number];
export type IssueReportStatus = (typeof ISSUE_REPORT_STATUSES)[number];

export type AiKnowledgeDocumentRecord = {
  id: string;
  filename: string;
  category: AiDocumentCategory;
  active: boolean;
  created_at: Date;
  updated_at: Date;
};

export type AiKnowledgeChunkRecord = {
  id: string;
  document_id: string;
  content: string;
  embedding: number[];
  created_at: Date;
};

export type ChatSessionRecord = {
  id: string;
  user_type: ChatSessionUserType;
  status: ChatSessionStatus;
  escalated_to: string | null;
  created_at: Date;
  updated_at: Date;
};

export type ChatMessageRecord = {
  id: string;
  session_id: string;
  role: ChatMessageRole;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

export type IssueReportRecord = {
  id: string;
  session_id: string | null;
  description: string;
  page_url: string;
  browser_info: string;
  screenshot_path: string | null;
  status: IssueReportStatus;
  created_at: Date;
};

export type AiPrequalSessionRecord = {
  id: string;
  session_id: string;
  revenue: number | null;
  industry: string | null;
  time_in_business: number | null;
  province: string | null;
  requested_amount: number | null;
  lender_matches: Record<string, unknown>[];
  created_at: Date;
};
