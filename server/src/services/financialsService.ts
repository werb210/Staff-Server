import { financialsRepo } from "../db/repositories/financials.repo";

export const financialsService = {
  async save(applicationId: string, data: any) {
    return financialsRepo.save(applicationId, data);
  },

  async get(applicationId: string) {
    return financialsRepo.findByApplication(applicationId);
  }
};
