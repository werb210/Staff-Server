const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

export const lendersService = {
  async list() {
    prismaRemoved();
  },

  async get(id: string) {
    prismaRemoved();
  },

  async create(data: unknown) {
    prismaRemoved();
  },

  async update(id: string, data: unknown) {
    prismaRemoved();
  },

  async delete(id: string) {
    prismaRemoved();
  },
};
