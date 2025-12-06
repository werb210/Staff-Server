// server/src/db/repositories/contacts.repo.ts

type ContactRecord = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  companyId?: string;
  [key: string]: any;
};

let _contacts: ContactRecord[] = [];

const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default {
  async findMany(_filter?: any): Promise<ContactRecord[]> {
    // ignoring filter for now – returns all
    return _contacts;
  },

  async findById(id: string): Promise<ContactRecord | null> {
    return _contacts.find((c) => c.id === id) || null;
  },

  async create(data: any): Promise<ContactRecord> {
    const record: ContactRecord = { id: makeId(), ...data };
    _contacts.push(record);
    return record;
  },

  async update(id: string, data: any): Promise<ContactRecord | null> {
    const idx = _contacts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    _contacts[idx] = { ..._contacts[idx], ...data };
    return _contacts[idx];
  },

  async delete(id: string): Promise<ContactRecord | null> {
    const idx = _contacts.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const [removed] = _contacts.splice(idx, 1);
    return removed;
  }
};
