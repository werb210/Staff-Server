import type { Request, Response } from "express";
import {
  getAllCards,
  getAllStages,
  getApplicationData,
  getApplicationDocuments,
  getApplicationLenders,
  moveCard,
} from "../services/pipelineService.js";
import { PipelineTransitionSchema } from "../schemas/pipeline.schema.js";

/**
 * GET /api/pipeline/stages
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
 * PUT /api/pipeline/cards/:id/move
 * Uses Zod to validate payload
 * Enforces Big Fix rule:
 *   - ID is ALWAYS cardId, never applicationId
 *   - fromStage is ignored (never trust client)
 *   - Only toStage is authoritative
 */
export const moveCardHandler = (req: Request, res: Response) => {
  const parsed = PipelineTransitionSchema.safeParse({
    applicationId: req.params.id,      // we map route ID → cardId
    fromStage: req.body.fromStage,     // validated but not trusted
    toStage: req.body.toStage,
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
    const cardId = parsed.data.applicationId;
    const newStage = parsed.data.toStage;

    // Pipeline service requires (cardId, newStage)
    const updated = moveCard(cardId, newStage);

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
    const documents = getApplicationDocuments(req.params.id);
    return res.json({ data: documents });
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
