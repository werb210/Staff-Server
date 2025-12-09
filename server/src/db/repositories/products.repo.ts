import { db } from "../db";
import { products } from "../schema/products";
import { eq } from "drizzle-orm";
import { Product } from "../types";

class ProductsRepo {
  async findMany(filter?: any): Promise<Product[]> {
    if (filter?.name) {
      return db
        .select()
        .from(products)
        .where(eq(products.name, filter.name));
    }

    return db.select().from(products);
  }

  async findById(id: string): Promise<Product | null> {
    const result = await db
      .select()
      .from(products)
      .where(eq(products.id, id));

    return result[0] ?? null;
  }

  async create(data: Omit<Product, "id" | "createdAt">): Promise<Product> {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  }

  async update(id: string, data: Partial<Product>): Promise<Product | null> {
    const result = await db
      .update(products)
      .set(data)
      .where(eq(products.id, id))
      .returning();

    return result[0] ?? null;
  }

  async delete(id: string): Promise<boolean> {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }
}

export default new ProductsRepo();
