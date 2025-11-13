import type { Request, Response } from "express";
import {
  getAllCards,
  getAllStages,
  getApplicationData,
  getApplicationDocuments,
  getApplicationLenders,
  moveCard,
} from "../services/pipelineService.js";
import {
  PipelineTransitionSchema,
  PipelineStageNameSchema,
  type PipelineStageName,
} from "../schemas/pipeline.schema.js";

/**
 * GET /api/pipeline/stages
 * Return ordered board with all canonical stages
 */
export const getStages = (_req: Request, res: Response) => {
  try {
    const stages = getAllStages();
    return res.json({ data: stages });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

/**
 * GET /api/pipeline/cards
 * Return list of canonical PipelineCards
 */
export const getCards = (_req: Request, res: Response) => {
  try {
    const cards = getAllCards();
    return res.json({ data: cards });
  } catch (err) {
    return res.status(500).json({ message: (err as Error).message });
  }
};

/**
 * Normalizes various inputs ("sent_to_lenders", "Sent to Lender", etc.)
 * to **canonical pipeline stage names**
 */
const normalizeStage = (value: unknown): PipelineStageName | undefined => {
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim().toLowerCase();

  switch (trimmed) {
    case "new":
    case "new application":
      return "New";

    case "requires docs":
    case "requires_documents":
    case "requires_documents":
    case "requiresdocs":
      return "Requires Docs";

    case "in review":
    case "review":
      return "In Review";

    case "sent to lenders":
    case "sent to lender":
    case "ready_for_lenders":
    case "ready for lenders":
      return "Sent to Lenders";

    case "approved":
      return "Approved";

    case "declined":
    case "rejected":
      return "Declined";

    default:
      return undefined;
  }
};

/**
 * PUT /api/pipeline/cards/:id/move
 * Validates → normalizes → applies Big Fix transition
 */
export const moveCardHandler = (req: Request, res: Response) => {
  // Normalize incoming stage names BEFORE schema validation
  const normalizedToStage = normalizeStage(req.body.toStage);
  const normalizedFromStage = normalizeStage(req.body.fromStage);

  const parsed = PipelineTransitionSchema.safeParse({
    applicationId: req.params.id,
    fromStage: normalizedFromStage,
    toStage: normalizedToStage,
    assignedTo: req.body.assignedTo,
    note: req.body.note,
  });

  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid stage transition",
      issues: parsed.error.errors,
    });
  }

  try {
    const updated = moveCard({
      applicationId: parsed.data.applicationId,
      toStage: parsed.data.toStage,
    });

    return res.json({ data: updated });
  } catch (err) {
    return res.status(400).json({ message: (err as Error).message });
  }
};

/**
 * GET /api/pipeline/cards/:id/application
 * Drawer → Application tab
 */
export const getApplicationDataHandler = (req: Request, res: Response) => {
  try {
    const data = getApplicationData(req.params.id);
    return res.json({ data });
  } catch (err) {
    return res.status(404).json({ message: (err as Error).message });
  }
};

/**
 * GET /api/pipeline/cards/:id/documents
 * Drawer → Documents tab
 */
export const getApplicationDocumentsHandler = (req: Request, res: Response) => {
  try {
    const docs = getApplicationDocuments(req.params.id);
    return res.json({ data: docs });
  } catch (err) {
    return res.status(404).json({ message: (err as Error).message });
  }
};

/**
 * GET /api/pipeline/cards/:id/lenders
 * Drawer → Lenders tab
 */
export const getApplicationLendersHandler = (req: Request, res: Response) => {
  try {
    const lenders = getApplicationLenders(req.params.id);
    return res.json({ data: lenders });
  } catch (err) {
    return res.status(404).json({ message: (err as Error).message });
  }
};
