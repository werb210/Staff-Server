import { db } from "../../lib/db";
import { CreateLenderDTO, UpdateLenderDTO } from "../../types/dto/lender.dto";

export const lenderService = {
  async list() {
    return db.lender.findMany();
  },

  async getById(id: string) {
    return db.lender.findUnique({ where: { id } });
  },

  async create(data: CreateLenderDTO) {
    return db.lender.create({ data });
  },

  async update(id: string, data: UpdateLenderDTO) {
    return db.lender.update({
      where: { id },
      data,
    });
  },

  async getWithProducts(id: string) {
    return db.lender.findUnique({
      where: { id },
      include: { lenderProducts: true },
    });
  },
};
