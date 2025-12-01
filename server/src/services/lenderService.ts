import { lenderProductsRepo } from "../db/repositories/lenderProducts.repo";

export const lenderService = {
  async listProducts(lenderId: string) {
    return lenderProductsRepo.listByLender(lenderId);
  },

  async addProduct(lenderId: string, data: any) {
    return lenderProductsRepo.create(lenderId, data);
  },

  async updateProduct(productId: string, data: any) {
    return lenderProductsRepo.update(productId, data);
  }
};
