import bankingAnalysisRepo from "../db/repositories/bankingAnalysis.repo.js";

export const bankingService = {
  async save(applicationId: string, data: any) {
    return bankingAnalysisRepo.create({
      applicationId,
      data,
      createdAt: new Date(),
    });
  },

  async get(applicationId: string) {
    return bankingAnalysisRepo.findOne({ applicationId });
  },
};

export default bankingService;
