// server/src/db/repositories/companies.repo.ts

type CompanyRecord = {
  id: string;
  name?: string;
  [key: string]: any;
};

let _companies: CompanyRecord[] = [];

// simple ID generator to avoid crypto import issues
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default {
  async findMany(_filter?: any): Promise<CompanyRecord[]> {
    // ignoring filter for now – returns all
    return _companies;
  },

  async findById(id: string): Promise<CompanyRecord | null> {
    return _companies.find((c) => c.id === id) || null;
  },

  async create(data: any): Promise<CompanyRecord> {
    const record: CompanyRecord = { id: makeId(), ...data };
    _companies.push(record);
    return record;
  },

  async update(id: string, data: any): Promise<CompanyRecord | null> {
    const idx = _companies.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    _companies[idx] = { ..._companies[idx], ...data };
    return _companies[idx];
  },

  async delete(id: string): Promise<CompanyRecord | null> {
    const idx = _companies.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const [removed] = _companies.splice(idx, 1);
    return removed;
  }
};
