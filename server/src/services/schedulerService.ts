export interface ScheduledTask {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
}

/**
 * Service representing a simple cron scheduler used for background tasks.
 */
export class SchedulerService {
  private readonly tasks: ScheduledTask[] = [
    { id: "task-1", name: "Sync Lender Status", cronExpression: "*/30 * * * *", enabled: true },
    { id: "task-2", name: "Generate Daily Metrics", cronExpression: "0 5 * * *", enabled: true }
  ];

  async registerTask(task: ScheduledTask): Promise<void> {
    this.tasks.push(task);
  }

  async listTasks(): Promise<ScheduledTask[]> {
    return [...this.tasks];
  }
}

export const schedulerService = new SchedulerService();
