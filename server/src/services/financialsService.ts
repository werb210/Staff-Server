import bankingAnalysisRepo from "../db/repositories/bankingAnalysis.repo.js";

export async function getAllFinancials() {
  return bankingAnalysisRepo.findMany();
}

export async function getFinancialsById(id: string) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  return bankingAnalysisRepo.findById(id);
}

export async function createFinancials(data: any) {
  return bankingAnalysisRepo.create({
    applicationId: data?.applicationId,
    data: data?.data ?? data ?? {},
  });
}

export async function updateFinancials(
  id: string,
  data: any,
) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  return bankingAnalysisRepo.update(id, { data: data?.data ?? data });
}

export async function deleteFinancials(id: string) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  return bankingAnalysisRepo.delete(id);
}

const financialsService = {
  list: getAllFinancials,
  get: getFinancialsById,
  create: createFinancials,
  update: updateFinancials,
  remove: deleteFinancials,
  getByApplication: getFinancialsById,
  processDocument: createFinancials,
};

export default financialsService;
