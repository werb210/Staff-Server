export type AiKnowledgeSourceType = "spec_sheet" | "faq" | "internal" | "product";

export type AiKnowledge = {
  id: string;
  title: string;
  content: string;
  source_type: AiKnowledgeSourceType;
  created_at: Date;
};
