const prismaRemoved = () => {
  throw new Error("Prisma has been removed — pending Drizzle migration in Block 14");
};

const db: any = new Proxy(prismaRemoved, {
  get() {
    return prismaRemoved;
  },
  apply: prismaRemoved,
});

export { db, prismaRemoved };
export default db;
