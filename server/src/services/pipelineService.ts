import { randomUUID } from "crypto";
import { applicationService } from "./applicationService.js";
import { getDocumentsForApplication } from "./documentService.js";
import { getAll as getAllLenders } from "./lendersService.js";
import {
  type PipelineTransitionInput,
} from "../schemas/pipeline.schema.js";

/**
 * Official Pipeline Columns
 */
export const PIPELINE_STAGES = [
  "New",
  "In Review",
  "Requires Docs",
  "Sent to Lender",
  "Accepted",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

interface PipelineCard {
  id: string;              // applicationId (canonical)
  applicationId: string;
  applicantName: string;
  stage: PipelineStage;
  updatedAt: string;
  amount: number;
  assignedTo?: string;
}

interface TimelineEvent {
  id: string;
  applicationId: string;
  fromStage: PipelineStage;
  toStage: PipelineStage;
  createdAt: string;
}

const cards = new Map<string, PipelineCard>();
const history = new Map<string, TimelineEvent[]>();

/**
 * Create a card from a real ApplicationService application
 */
const buildCardFromApplication = (app: any): PipelineCard => {
  const now = new Date().toISOString();

  let stage: PipelineStage = "New";

  // Rule #1: no docs -> Requires Docs
  const docs = getDocumentsForApplication(app.id);
  if (docs.length === 0) {
    stage = "Requires Docs";
  }

  // Rule #2: any doc rejected -> Requires Docs
  if (docs.some((d) => d.status === "rejected")) {
    stage = "Requires Docs";
  }

  // Existing application status → Map to pipeline stage
  switch (app.status) {
    case "review":
      stage = "In Review";
      break;
    case "approved":
      stage = "Sent to Lender";
      break;
    case "completed":
      stage = "Accepted";
      break;
  }

  return {
    id: app.id,
    applicationId: app.id,
    applicantName: app.applicantName,
    amount: app.loanAmount ?? 0,
    updatedAt: app.updatedAt ?? now,
    assignedTo: app.assignedTo,
    stage,
  };
};

/**
 * Build all cards from real applications
 */
const rebuildCards = () => {
  cards.clear();
  const apps = applicationService.listApplications();
  apps.forEach((app) => {
    const card = buildCardFromApplication(app);
    cards.set(app.id, card);
  });
};

rebuildCards();

/**
 * Helpers
 */
const requireCard = (id: string): PipelineCard => {
  const card = cards.get(id);
  if (!card) {
    throw new Error(`Card ${id} not found`);
  }
  return card;
};

/**
 * Return stages + cards
 */
export const getAllStages = () => {
  rebuildCards();

  return PIPELINE_STAGES.map((stage) => {
    const stageCards = Array.from(cards.values()).filter(
      (c) => c.stage === stage
    );

    return {
      id: stage,
      name: stage,
      cards: stageCards,
    };
  });
};

export const getAllCards = () => {
  rebuildCards();
  return Array.from(cards.values());
};

/**
 * Apply transition rules
 */
export const moveCard = (payload: PipelineTransitionInput) => {
  const { applicationId, toStage } = payload;

  const card = requireCard(applicationId);

  const now = new Date().toISOString();
  const previousStage = card.stage;

  const updated: PipelineCard = {
    ...card,
    stage: toStage,
    updatedAt: now,
  };

  cards.set(applicationId, updated);

  const timelineEntry: TimelineEvent = {
    id: randomUUID(),
    applicationId,
    fromStage: previousStage,
    toStage,
    createdAt: now,
  };

  const events = history.get(applicationId) ?? [];
  history.set(applicationId, [...events, timelineEntry]);

  return updated;
};

/**
 * Drawer → Application tab
 */
export const getApplicationData = (applicationId: string) => {
  const apps = applicationService.listApplications();
  const app = apps.find((a) => a.id === applicationId);
  if (!app) {
    throw new Error("Application not found");
  }

  const docs = getDocumentsForApplication(applicationId);
  const lenders = getAllLenders().slice(0, 5);

  return {
    application: app,
    documents: docs,
    lenderMatches: lenders,
    timeline: history.get(applicationId) ?? [],
  };
};

/**
 * Drawer → Documents tab
 */
export const getApplicationDocuments = (applicationId: string) => {
  return getDocumentsForApplication(applicationId);
};

/**
 * Drawer → Lenders tab
 */
export const getApplicationLenders = (_applicationId: string) => {
  return getAllLenders();
};

/**
 * Legacy wrapper
 */
export class PipelineService {
  public getBoard() {
    return {
      stages: getAllStages(),
      cards: getAllCards(),
    };
  }

  public transitionApplication(input: PipelineTransitionInput) {
    return { card: moveCard(input) };
  }
}

export const createPipelineService = () => new PipelineService();
export const pipelineService = new PipelineService();
