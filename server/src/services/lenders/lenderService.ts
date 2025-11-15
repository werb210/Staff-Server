import { db } from "../db.js";
import { uuid } from "../../utils/uuid.js";
import type { LenderRecord, Silo } from "../db.js";

export const lenderService = {
  async list(silo: Silo): Promise<LenderRecord[]> {
    return db.lenders[silo]?.data ?? [];
  },

  async create(silo: Silo, data: Partial<LenderRecord>): Promise<LenderRecord> {
    const record: LenderRecord = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      name: typeof data.name === "string" ? data.name : "Unnamed Lender",
      silo,
      products: Array.isArray(data.products) ? data.products : [],
    };
    db.lenders[silo].data.push(record);
    return record;
  },

  async update(
    silo: Silo,
    id: string,
    patch: Partial<LenderRecord>
  ): Promise<LenderRecord | null> {
    const table = db.lenders[silo];
    const index = table.data.findIndex((lender) => lender.id === id);
    if (index === -1) return null;

    table.data[index] = {
      ...table.data[index],
      ...patch,
      updatedAt: new Date(),
    };
    return table.data[index];
  },

  async remove(silo: Silo, id: string): Promise<boolean> {
    const table = db.lenders[silo];
    const before = table.data.length;
    table.data = table.data.filter((lender) => lender.id !== id);
    return table.data.length < before;
  },

  async listProducts(silo: Silo, lenderId: string): Promise<unknown[]> {
    const lender = db.lenders[silo].data.find((item) => item.id === lenderId);
    return Array.isArray(lender?.products) ? lender!.products : [];
  },

  async createProduct(
    silo: Silo,
    lenderId: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown> | null> {
    const lender = db.lenders[silo].data.find((item) => item.id === lenderId);
    if (!lender) return null;

    const product = {
      id: uuid(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };

    lender.products = Array.isArray(lender.products) ? lender.products : [];
    lender.products.push(product);
    lender.updatedAt = new Date();

    return product;
  },
};
