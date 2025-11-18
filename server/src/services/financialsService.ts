import prisma from "../../db/prisma.js";
import { Prisma } from "@prisma/client";

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

export async function createFinancials(data: Prisma.FinancialsCreateInput) {
  try {
    return await prisma.financials.create({ data });
  } catch (error) {
    throw error;
  }
}

export async function updateFinancials(
  id: string,
  data: Prisma.FinancialsUpdateInput,
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
