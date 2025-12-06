// server/src/db/repositories/products.repo.ts

type ProductRecord = {
  id: string;
  name?: string;
  [key: string]: any;
};

let _products: ProductRecord[] = [];

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default {
  async findMany(_filter?: any): Promise<ProductRecord[]> {
    // ignoring filter for now – returns all
    return _products;
  },

  async findById(id: string): Promise<ProductRecord | null> {
    return _products.find((p) => p.id === id) || null;
  },

  async create(data: any): Promise<ProductRecord> {
    const record: ProductRecord = { id: makeId(), ...data };
    _products.push(record);
    return record;
  },

  async update(id: string, data: any): Promise<ProductRecord | null> {
    const idx = _products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    _products[idx] = { ..._products[idx], ...data };
    return _products[idx];
  },

  async delete(id: string): Promise<ProductRecord | null> {
    const idx = _products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [removed] = _products.splice(idx, 1);
    return removed;
  }
};
