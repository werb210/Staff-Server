import { randomUUID } from "crypto";
import { applicationService } from "./applicationService.js";
import { getDocumentsForApplication } from "./documentService.js";
import { getAll as getAllLenders } from "./lendersService.js";
import {
  type PipelineStageName,
} from "../schemas/pipeline.schema.js";

/**
 * Canonical stage list (must match pipeline.schema.ts EXACTLY)
 */
export const PIPELINE_STAGES: PipelineStageName[] = [
  "New",
  "Requires Docs",
  "In Review",
  "Sent to Lenders",
  "Approved",
  "Declined",
];

/**
 * PipelineCard stored in memory
 */
interface PipelineCard {
  id: string; // applicationId = cardId
  applicationId: string;
  applicantName: string;
  amount: number;
  stage: PipelineStageName;
  updatedAt: string;
  assignedTo?: string;
}

/**
 * Timeline event history
 */
interface TimelineEvent {
  id: string;
  applicationId: string;
  fromStage: PipelineStageName;
  toStage: PipelineStageName;
  createdAt: string;
}

/**
 * Internal memory stores
 */
const cards = new Map<string, PipelineCard>();
const timeline = new Map<string, TimelineEvent[]>();

/**
 * Build card from application (ONLY used for first-time seed)
 */
const buildInitialCard = (app: any): PipelineCard => {
  const now = new Date().toISOString();
  let stage: PipelineStageName = "New";

  const docs = getDocumentsForApplication(app.id);

  // Rule #1 – zero docs → Requires Docs
  if (docs.length === 0) {
    stage = "Requires Docs";
  }

  // Rule #2 – any rejected doc → Requires Docs
  if (docs.some((d) => d.status === "rejected")) {
    stage = "Requires Docs";
  }

  // Map application.status → pipeline stage
  switch (app.status) {
    case "review":
      stage = "In Review";
      break;

    case "approved":
      stage = "Sent to Lenders";
      break;

    case "completed":
      stage = "Approved";
      break;

    case "declined":
      stage = "Declined";
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
 * Sync card metadata with actual applications
 * NEVER overwrite user-controlled stage
 */
const syncCards = () => {
  const apps = applicationService.listApplications();

  apps.forEach((app) => {
    const existing = cards.get(app.id);

    if (!existing) {
      // First time → build new card
      cards.set(app.id, buildInitialCard(app));
      return;
    }

    // Sync metadata only
    existing.applicantName = app.applicantName;
    existing.amount = app.loanAmount ?? existing.amount;
    existing.updatedAt = app.updatedAt ?? existing.updatedAt;
    existing.assignedTo = app.assignedTo;

    cards.set(app.id, existing);
  });
};

/**
 * Must exist or throw
 */
const requireCard = (id: string): PipelineCard => {
  const card = cards.get(id);
  if (!card) {
    throw new Error(`Card ${id} not found`);
  }
  return card;
};

/**
 * PUBLIC: return board stages
 */
export const getAllStages = () => {
  syncCards();

  return PIPELINE_STAGES.map((stage) => {
    const stageCards = Array.from(cards.values()).filter(
      (c) => c.stage === stage
    );

    return {
      id: stage,
      name: stage,
      stage,
      cards: stageCards,
      position: PIPELINE_STAGES.indexOf(stage),
      count: stageCards.length,
      totalLoanAmount: stageCards.reduce(
        (sum, c) => sum + (c.amount ?? 0),
        0
      ),
      averageScore: undefined,
      lastUpdatedAt: new Date().toISOString(),
      applications: [],
    };
  });
};

/**
 * PUBLIC: return all cards
 */
export const getAllCards = () => {
  syncCards();
  return Array.from(cards.values());
};

/**
 * BIG FIX: move card ONLY using validated pipeline stage
 */
export const moveCard = (payload: {
  applicationId: string;
  toStage: PipelineStageName;
}) => {
  syncCards();

  const { applicationId, toStage } = payload;

  if (!PIPELINE_STAGES.includes(toStage)) {
    throw new Error(`Invalid stage: ${toStage}`);
  }

  const card = requireCard(applicationId);

  const now = new Date().toISOString();

  const updated: PipelineCard = {
    ...card,
    stage: toStage,
    updatedAt: now,
  };

  cards.set(applicationId, updated);

  const event: TimelineEvent = {
    id: randomUUID(),
    applicationId,
    fromStage: card.stage,
    toStage,
    createdAt: now,
  };

  const events = timeline.get(applicationId) ?? [];
  timeline.set(applicationId, [...events, event]);

  return updated;
};

/**
 * Drawer – Application tab
 */
export const getApplicationData = (applicationId: string) => {
  syncCards();

  const app = applicationService.listApplications().find(
    (a) => a.id === applicationId
  );

  if (!app) throw new Error("Application not found");

  const docs = getDocumentsForApplication(applicationId);
  const lenders = getAllLenders().slice(0, 5);

  return {
    application: app,
    documents: docs,
    lenderMatches: lenders,
    timeline: timeline.get(applicationId) ?? [],
  };
};

/**
 * Drawer – Documents tab
 */
export const getApplicationDocuments = (applicationId: string) => {
  return getDocumentsForApplication(applicationId);
};

/**
 * Drawer – Lenders tab
 */
export const getApplicationLenders = () => {
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

  public transitionApplication(input: {
    applicationId: string;
    toStage: PipelineStageName;
  }) {
    return { card: moveCard(input) };
  }
}

export const createPipelineService = () => new PipelineService();
export const pipelineService = new PipelineService();
