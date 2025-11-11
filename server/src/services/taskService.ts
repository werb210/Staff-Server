import { randomUUID } from "crypto";
import { z } from "zod";

const TaskSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  dueAt: z.string().datetime(),
  status: z.enum(["pending", "in-progress", "completed"]).default("pending"),
  assignedTo: z.string().optional(),
});

export type Task = z.infer<typeof TaskSchema>;

export interface TaskCreateInput {
  name: string;
  description?: string;
  dueAt: string;
  assignedTo?: string;
}

export class TaskService {
  private readonly tasks = new Map<string, Task>();

  constructor(seed?: Task[]) {
    seed?.forEach((task) => this.tasks.set(task.id, task));
  }

  public listTasks(): Task[] {
    return Array.from(this.tasks.values()).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
  }

  public createTask(input: TaskCreateInput): Task {
    const task = TaskSchema.parse({
      id: randomUUID(),
      name: input.name,
      description: input.description,
      dueAt: input.dueAt,
      assignedTo: input.assignedTo,
    });
    this.tasks.set(task.id, task);
    return task;
  }

  public updateStatus(id: string, status: Task["status"]): Task {
    const existing = this.tasks.get(id);
    if (!existing) {
      throw new Error("Task not found");
    }
    const updated = { ...existing, status } satisfies Task;
    this.tasks.set(id, updated);
    return updated;
  }
}

export const createTaskService = (seed?: Task[]): TaskService => new TaskService(seed);
