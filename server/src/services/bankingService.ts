import { bankingAnalysisRepo } from "../db/repositories/bankingAnalysis.repo";

export const bankingService = {
  async saveAnalysis(applicationId: string, data: any) {
    return bankingAnalysisRepo.save(applicationId, data);
  },

  async getAnalysis(applicationId: string) {
    return bankingAnalysisRepo.findByApplication(applicationId);
  }
};
