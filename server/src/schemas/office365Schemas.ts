import { z } from "zod";

export const Office365EmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
});

export const Office365EventSchema = z.object({
  title: z.string().min(1),
  start: z.string().datetime({ offset: true }),
  end: z.string().datetime({ offset: true }),
});

export const Office365TaskSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime({ offset: true }).optional(),
});
