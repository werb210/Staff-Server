import { db, type Silo } from "./db.js";

const STAGES = [
  "new",
  "requires_docs",
  "in_review",
  "ready_for_lenders",
  "sent_to_lenders",
  "approved",
  "declined",
] as const;

export type PipelineStage = (typeof STAGES)[number];

export const pipelineService = {
  getBoard(silo: Silo) {
    return db.pipeline[silo].data;
  },

  move(silo: Silo, appId: string, { toStage }: { toStage: PipelineStage }) {
    if (!STAGES.includes(toStage)) throw new Error("Invalid pipeline stage");

    const list = db.pipeline[silo].data;
    const idx = list.findIndex((c) => c.appId === appId);

    if (idx === -1) {
      const card = { id: db.id(), appId, stage: toStage };
      list.push(card);
      return card;
    }

    list[idx].stage = toStage;
    return list[idx];
  },
};
