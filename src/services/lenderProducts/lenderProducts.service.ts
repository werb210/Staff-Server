import { db } from "../../infra/db";
import {
  CreateLenderProductDTO,
  UpdateLenderProductDTO,
} from "../../types/dto/lenderProduct.dto";

export const lenderProductsService = {
  async list() {
    return db.lenderProduct.findMany();
  },

  async create(data: CreateLenderProductDTO) {
    return db.lenderProduct.create({ data });
  },

  async update(id: string, data: UpdateLenderProductDTO) {
    return db.lenderProduct.update({
      where: { id },
      data,
    });
  },
};
