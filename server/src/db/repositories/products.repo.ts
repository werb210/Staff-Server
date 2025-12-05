import { randomUUID } from "crypto";

export interface Product {
  id: string;
  name: string;
  category?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const products: Product[] = [];

function matchesFilter(row: Product, filter?: any) {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => {
    if (typeof v === "string") {
      return row[k]?.toString().toLowerCase().includes(v.toLowerCase());
    }
    return row[k] === v;
  });
}

export default {
  async findMany(filter?: any): Promise<Product[]> {
    return products.filter(p => matchesFilter(p, filter));
  },

  async findById(id: string): Promise<Product | null> {
    return products.find(p => p.id === id) || null;
  },

  async create(data: any): Promise<Product> {
    const row: Product = {
      id: randomUUID(),
      name: data.name,
      category: data.category || null,
      description: data.description || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    products.push(row);
    return row;
  },

  async update(id: string, data: any): Promise<Product | null> {
    const row = products.find(p => p.id === id);
    if (!row) return null;

    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  },

  async delete(id: string): Promise<{ id: string } | null> {
    const idx = products.findIndex(p => p.id === id);
    if (idx === -1) return null;

    products.splice(idx, 1);
    return { id };
  }
};
