// ============================================================================
// server/src/services/pipelineStageService.ts
// Simplified to static pipeline stages backed by Drizzle-era pipeline events
// ============================================================================

import { VALID_STAGES } from "./pipelineService.js";

const buildStage = (name: string, order: number) => ({
  id: name,
  name,
  order,
  createdAt: new Date(0),
  updatedAt: new Date(0),
});

const pipelineStageService = {
  async list() {
    return VALID_STAGES.map((stage, idx) => buildStage(stage, idx + 1));
  },

  async get(stageId: string) {
    const index = VALID_STAGES.indexOf(stageId);
    if (index === -1) return null;
    return buildStage(stageId, index + 1);
  },

  async create(name: string, order: number) {
    const stages = await this.list();
    const updated = [...stages, buildStage(name, order)].sort((a, b) => a.order - b.order);
    return updated.find((s) => s.id === name) ?? buildStage(name, order);
  },

  async update(stageId: string, data: { name?: string; order?: number }) {
    const stage = await this.get(stageId);
    if (!stage) throw new Error(`Pipeline stage not found: ${stageId}`);
    return buildStage(data.name ?? stage.name, data.order ?? stage.order);
  },

  async remove(stageId: string) {
    const stage = await this.get(stageId);
    if (!stage) throw new Error(`Pipeline stage not found: ${stageId}`);
    return stage;
  },

  async reorder(stageOrders: { id: string; order: number }[]) {
    return stageOrders.map((stage) => buildStage(stage.id, stage.order)).sort((a, b) => a.order - b.order);
  },
};

export default pipelineStageService;

// ============================================================================
// END OF FILE
// ============================================================================
