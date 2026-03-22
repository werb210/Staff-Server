import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const lender = await db.lender.create({
    data: {
      name: "Test Lender",
    },
  });

  await db.lenderProduct.create({
    data: {
      lenderId: lender.id,
      name: "Test Product",
    },
  });

  console.log("Seed complete");
}

main().finally(() => db.$disconnect());
