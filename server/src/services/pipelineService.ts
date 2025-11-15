import { db, type Silo } from "./db.js";
import { uuid } from "../utils/uuid.js";
import type { PipelineRecord, Stage } from "../types/pipeline.js";

export const pipelineService = {
  list(silo: Silo): PipelineRecord[] {
    return db.pipeline[silo]?.data ?? [];
  },

  get(silo: Silo, id: string): PipelineRecord | null {
    return db.pipeline[silo]?.data.find(c => c.id === id) ?? null;
  },

  create(silo: Silo, appId: string, stage: Stage): PipelineRecord {
    const record: PipelineRecord = {
      id: uuid(),
      appId,
      stage,
      silo,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    db.pipeline[silo].data.push(record);
    return record;
  },

  updateStage(silo: Silo, id: string, stage: Stage): PipelineRecord | null {
    const table = db.pipeline[silo];
    const card = table.data.find(c => c.id === id);
    if (!card) return null;
    card.stage = stage;
    card.updatedAt = new Date();
    return card;
  },

  delete(silo: Silo, id: string): boolean {
    const table = db.pipeline[silo];
    const before = table.data.length;
    table.data = table.data.filter(c => c.id !== id);
    return table.data.length < before;
  }
};
