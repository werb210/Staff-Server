import { randomUUID } from "crypto";

export interface Tag {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const tags: Tag[] = [];

function matchesFilter(row: Tag, filter?: any) {
  if (!filter) return true;
  return Object.entries(filter).every(([k, v]) => {
    if (typeof v === "string")
      return row[k]?.toLowerCase().includes(v.toLowerCase());
    return row[k] === v;
  });
}

export default {
  async findMany(filter?: any): Promise<Tag[]> {
    return tags.filter(t => matchesFilter(t, filter));
  },

  async findById(id: string): Promise<Tag | null> {
    return tags.find(t => t.id === id) || null;
  },

  async create(data: any): Promise<Tag> {
    const row: Tag = {
      id: randomUUID(),
      name: data.name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    tags.push(row);
    return row;
  },

  async update(id: string, data: any): Promise<Tag | null> {
    const row = tags.find(t => t.id === id);
    if (!row) return null;

    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  },

  async delete(id: string): Promise<{ id: string } | null> {
    const idx = tags.findIndex(t => t.id === id);
    if (idx === -1) return null;

    tags.splice(idx, 1);
    return { id };
  }
};
