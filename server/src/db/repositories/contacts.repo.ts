let _contacts: any[] = [];

export default {
  async findMany() {
    return _contacts;
  },

  async findById(id: string) {
    return _contacts.find((c) => c.id === id) || null;
  },

  async create(data: any) {
    const record = { id: crypto.randomUUID(), ...data };
    _contacts.push(record);
    return record;
  },

  async update(id: string, data: any) {
    const idx = _contacts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    _contacts[idx] = { ..._contacts[idx], ...data };
    return _contacts[idx];
  },

  async delete(id: string) {
    const idx = _contacts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const [removed] = _contacts.splice(idx, 1);
    return removed;
  }
};
