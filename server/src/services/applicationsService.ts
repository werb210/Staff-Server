import applicationsRepo from "../db/repositories/applications.repo.js";

export const applicationsService = {
  async list() {
    return applicationsRepo.findMany();
  },

  async get(id: string) {
    return applicationsRepo.findById(id);
  },

  async create(data: Partial<typeof import("../db/schema/applications.js").applications.$inferInsert>) {
    return applicationsRepo.create({
      status: 'in-progress',
      pipelineStage: 'Not Submitted',
      currentStep: 'step1',
      formData: {},
      ...data,
    });
  },

  async update(id: string, data: Partial<typeof import("../db/schema/applications.js").applications.$inferInsert>) {
    return applicationsRepo.update(id, { ...data, updatedAt: new Date() });
  },

  async delete(id: string) {
    return applicationsRepo.delete(id);
  },
};
