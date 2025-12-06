import { db } from "../db";
import { companies } from "../schema/companies";
import { eq } from "drizzle-orm";
import { Company } from "../types";

class CompaniesRepo {
  async findMany(filter?: any): Promise<Company[]> {
    if (filter?.name) {
      return db
        .select()
        .from(companies)
        .where(eq(companies.name, filter.name));
    }

    return db.select().from(companies);
  }

  async findById(id: string): Promise<Company | null> {
    const result = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id));

    return result[0] ?? null;
  }

  async create(data: Partial<Company>): Promise<Company> {
    const result = await db.insert(companies).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<Company>): Promise<Company | null> {
    const result = await db
      .update(companies)
      .set(data)
      .where(eq(companies.id, id))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    await db.delete(companies).where(eq(companies.id, id));
    return true;
  }
}

export default new CompaniesRepo();
