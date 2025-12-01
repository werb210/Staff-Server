const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

export async function getAllFinancials() {
  prismaRemoved();
}

export async function getFinancialsById(id: string) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  prismaRemoved();
}

export async function createFinancials(data: any) {
  prismaRemoved();
}

export async function updateFinancials(
  id: string,
  data: any,
) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  prismaRemoved();
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

export async function deleteFinancials(id: string) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  prismaRemoved();
}
