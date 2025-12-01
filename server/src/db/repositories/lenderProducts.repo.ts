import { randomUUID } from "crypto";

type LenderProduct = {
  id: string;
  lenderId: string;
  data: any;
  createdAt: Date;
  updatedAt: Date;
};

const products: LenderProduct[] = [];

const findIndex = (productId: string) => products.findIndex((p) => p.id === productId);

export const lenderProductsRepo = {
  async listByLender(lenderId: string) {
    return products.filter((product) => product.lenderId === lenderId);
  },

  async create(lenderId: string, data: any) {
    const record: LenderProduct = {
      id: randomUUID(),
      lenderId,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    products.push(record);
    return record;
  },

  async update(productId: string, data: any) {
    const index = findIndex(productId);
    if (index === -1) return null;

    const updated: LenderProduct = {
      ...products[index],
      data,
      updatedAt: new Date()
    };
    products[index] = updated;
    return updated;
  }
};

export default lenderProductsRepo;
