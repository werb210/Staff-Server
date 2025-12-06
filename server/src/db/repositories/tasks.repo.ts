import { randomUUID } from "crypto";

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const tasks: Task[] = [];

// Same loose filter pattern as usersRepo
function matchesFilter(row: Task, filter?: any): boolean {
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

const tasksRepo = {
  async findMany(filter?: any): Promise<Task[]> {
    return tasks.filter((t) => matchesFilter(t, filter));
  },

  async findById(id: string): Promise<Task | null> {
    return tasks.find((t) => t.id === id) || null;
  },

  async create(data: any): Promise<Task> {
    const now = new Date();

    const row: Task = {
      id: randomUUID(),
      title: data.title ?? "",
      description: data.description ?? "",
      completed: !!data.completed,
      createdAt: now,
      updatedAt: now,
    };

    tasks.push(row);
    return row;
  },

  async update(id: string, data: any): Promise<Task | null> {
    const row = tasks.find((t) => t.id === id);
    if (!row) return null;

    Object.assign(row, data, { updatedAt: new Date() });
    return row;
  },

  async delete(id: string): Promise<{ id: string } | null> {
    const idx = tasks.findIndex((t) => t.id === id);
    if (idx === -1) return null;

    tasks.splice(idx, 1);
    return { id };
  },
};

export default tasksRepo;
