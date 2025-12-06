let _companies: any[] = [];

export default {
  async findMany() {
    return _companies;
  },

  async findById(id: string) {
    return _companies.find((c) => c.id === id) || null;
  },

  async create(data: any) {
    const record = { id: crypto.randomUUID(), ...data };
    _companies.push(record);
    return record;
  },

  async update(id: string, data: any) {
    const idx = _companies.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    _companies[idx] = { ..._companies[idx], ...data };
    return _companies[idx];
  },

  async delete(id: string) {
    const idx = _companies.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const [removed] = _companies.splice(idx, 1);
    return removed;
  }
};
