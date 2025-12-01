// server/src/services/companiesService.ts
const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

export const companiesService = {
  list() {
    prismaRemoved();
  },

  get(id: string) {
    prismaRemoved();
  },

  create(data: unknown) {
    prismaRemoved();
  },

  update(id: string, data: unknown) {
    prismaRemoved();
  },

  delete(id: string) {
    prismaRemoved();
  },
};
