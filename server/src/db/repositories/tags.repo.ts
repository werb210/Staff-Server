import { randomUUID } from "crypto";

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

const tags: Tag[] = [];

function matchesFilter(row: Tag, filter?: any): boolean {
  if (!filter) return true;
  const record: any = row;

  return Object.entries(filter).every(([k, v]) => {
    const current = record[k as keyof typeof record];

    if (typeof v === "string") {
      return current
        ?.toString()
        .toLowerCase()
        .includes(v.toLowerCase());
    }

    return current === v;
  });
}

const tagsRepo = {
  async findMany(filter?: any): Promise<Tag[]> {
    return tags.filter((t) => matchesFilter(t, filter));
  },

  async findById(id: string): Promise<Tag | null> {
    return tags.find((t) => t.id === id) || null;
  },

  async create(data: any): Promise<Tag> {
    const now = new Date();

    const row: Tag = {
      id: randomUUID(),
      name: data.name ?? "",
      color: data.color,
      createdAt: now,
      updatedAt: now,
    };

    tags.push(row);
    return row;
  },

  async update(id: string, data: any): Promise<Tag | null> {
    const row = tags.find((t) => t.id === id);
    if (!row) return null;

    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  },

  async delete(id: string): Promise<{ id: string } | null> {
    const idx = tags.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    tags.splice(idx, 1);
    return { id };
  },
};

export default tagsRepo;
