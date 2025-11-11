import { randomUUID } from "crypto";
import { Office365EmailSchema, Office365EventSchema, Office365TaskSchema } from "../schemas/office365Schemas.js";
import { logInfo } from "../utils/logger.js";
import { parseWithSchema } from "../utils/validation.js";

type Office365Event = {
  id: string;
  title: string;
  start: string;
  end: string;
};

type Office365Task = {
  id: string;
  title: string;
  dueDate?: string;
};

class Office365Service {
  private calendar: Office365Event[] = [];
  private tasks: Office365Task[] = [];

  constructor() {
    this.calendar.push({
      id: randomUUID(),
      title: "Kickoff Meeting",
      start: new Date().toISOString(),
      end: new Date(Date.now() + 3600 * 1000).toISOString(),
    });
    this.tasks.push({
      id: randomUUID(),
      title: "Prepare onboarding docs",
      dueDate: new Date(Date.now() + 86400 * 1000).toISOString(),
    });
  }

  listCalendar(): Office365Event[] {
    logInfo("Listing Office 365 calendar events");
    return this.calendar;
  }

  createEvent(payload: unknown): Office365Event {
    const data = parseWithSchema(Office365EventSchema, payload);
    logInfo("Creating Office 365 event", data);
    const event: Office365Event = {
      id: randomUUID(),
      ...data,
    };
    this.calendar.push(event);
    return event;
  }

  sendEmail(payload: unknown): { id: string } {
    const data = parseWithSchema(Office365EmailSchema, payload);
    logInfo("Sending Office 365 email", data);
    return { id: `office-email-${Date.now()}` };
  }

  listTasks(): Office365Task[] {
    logInfo("Listing Office 365 tasks");
    return this.tasks;
  }

  createTask(payload: unknown): Office365Task {
    const data = parseWithSchema(Office365TaskSchema, payload);
    logInfo("Creating Office 365 task", data);
    const task: Office365Task = {
      id: randomUUID(),
      ...data,
    };
    this.tasks.push(task);
    return task;
  }
}

export const office365Service = new Office365Service();
