import prisma from "../db/prisma.js";

export async function getAllFinancials() {
  try {
    return await prisma.financials.findMany({
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    throw error;
  }
}

export async function getFinancialsById(id: string) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  try {
    const rec = await prisma.financials.findUnique({ where: { id } });

    if (!rec) {
      throw new Error("Financials record not found");
    }

    return rec;
  } catch (error) {
    throw error;
  }
}

export async function createFinancials(data: any) {
  try {
    return await prisma.financials.create({ data });
  } catch (error) {
    throw error;
  }
}

export async function updateFinancials(
  id: string,
  data: any,
) {
  if (!id) {
    throw new Error("Financials id is required");
  }

  try {
    return await prisma.financials.update({
      where: { id },
      data,
    });
  } catch (error) {
    throw error;
  }
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

  try {
    return await prisma.financials.delete({ where: { id } });
  } catch (error) {
    throw error;
  }
}
