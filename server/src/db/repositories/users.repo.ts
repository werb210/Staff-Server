import { randomUUID } from "crypto";

export interface User {
  id: string;
  email: string;
  password: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const users: User[] = [];

// Simple in-memory filtering with loose typing to keep TS happy
function matchesFilter(row: User, filter?: any): boolean {
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

const usersRepo = {
  async findMany(filter?: any): Promise<User[]> {
    return users.filter((u) => matchesFilter(u, filter));
  },

  async findById(id: string): Promise<User | null> {
    return users.find((u) => u.id === id) || null;
  },

  async findByEmail(email: string): Promise<User | null> {
    return users.find((u) => u.email === email) || null;
  },

  // Used by authService – generic finder based on a filter object
  async findOne(filter: any): Promise<User | null> {
    const matches = await usersRepo.findMany(filter);
    return matches[0] || null;
  },

  async create(data: any): Promise<User> {
    const row: User = {
      id: randomUUID(),
      email: data.email,
      password: data.password,
      role: data.role || "staff",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    users.push(row);
    return row;
  },

  async update(id: string, data: any): Promise<User | null> {
    const row = users.find((u) => u.id === id);
    if (!row) return null;

    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  },

  async delete(id: string): Promise<{ id: string } | null> {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    users.splice(idx, 1);
    return { id };
  },
};

export default usersRepo;
