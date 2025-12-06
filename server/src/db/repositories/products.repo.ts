let _products: any[] = [];

export default {
  async findMany() {
    return _products;
  },

  async findById(id: string) {
    return _products.find((p) => p.id === id) || null;
  },

  async create(data: any) {
    const record = { id: crypto.randomUUID(), ...data };
    _products.push(record);
    return record;
  },

  async update(id: string, data: any) {
    const idx = _products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    _products[idx] = { ..._products[idx], ...data };
    return _products[idx];
  },

  async delete(id: string) {
    const idx = _products.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    const [removed] = _products.splice(idx, 1);
    return removed;
  }
};
