import { pgEnum } from "drizzle-orm/pg-core";

export const userTypeEnum = pgEnum("user_type", ["staff", "lender", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted",
  "in_review",
  "conditional_approval",
  "approved",
  "funded",
  "rejected",
  "withdrawn",
]);

export const applicationStageEnum = pgEnum("application_stage", [
  "intake",
  "document_collection",
  "analysis",
  "underwriting",
  "offer",
  "closing",
  "post_funding",
]);

export const productTypeEnum = pgEnum("product_type", [
  "term_loan",
  "line_of_credit",
  "equipment",
  "invoice_factoring",
  "merchant_cash_advance",
  "other",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "identity",
  "banking",
  "tax",
  "financials",
  "corporate",
  "other",
]);

export const documentStatusEnum = pgEnum("document_status", [
  "pending",
  "processing",
  "completed",
  "rejected",
]);

export const ownerRoleEnum = pgEnum("owner_role", ["primary", "secondary", "guarantor", "officer"]);

export const businessEntityTypeEnum = pgEnum("business_entity_type", [
  "llc",
  "corporation",
  "partnership",
  "sole_proprietorship",
  "non_profit",
  "other",
]);

export const questionTypeEnum = pgEnum("question_type", [
  "text",
  "number",
  "select",
  "multiselect",
  "date",
  "boolean",
  "file",
]);

export const communicationTypeEnum = pgEnum("communication_type", [
  "sms",
  "chat",
  "internal_note",
  "ai_log",
]);

export const communicationDirectionEnum = pgEnum("communication_direction", [
  "inbound",
  "outbound",
  "internal",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "open",
  "in_progress",
  "completed",
  "blocked",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);

export const ocrStatusEnum = pgEnum("ocr_status", ["pending", "processing", "success", "failed"]);

export const bankingAnalysisStatusEnum = pgEnum("banking_analysis_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const marketingEventTypeEnum = pgEnum("marketing_event_type", [
  "page_view",
  "form_submission",
  "campaign_click",
  "email_open",
  "call",
  "chat",
  "signup",
  "conversion",
]);

export const transmissionChannelEnum = pgEnum("transmission_channel", [
  "email",
  "sms",
  "webhook",
  "sftp",
  "api",
]);

export const transmissionStatusEnum = pgEnum("transmission_status", [
  "pending",
  "sent",
  "delivered",
  "failed",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "login",
  "logout",
  "permission_change",
]);

export const aiTrainingSourceEnum = pgEnum("ai_training_source", [
  "document",
  "communication",
  "task",
  "note",
  "knowledge_base",
]);
