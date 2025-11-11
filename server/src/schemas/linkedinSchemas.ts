import { z } from "zod";

export const LinkedInSequenceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  steps: z.array(
    z.object({
      order: z.number().int().nonnegative(),
      action: z.enum(["connect", "message", "follow-up"]),
      content: z.string().min(1),
    })
  ),
});

export const CreateLinkedInSequenceSchema = LinkedInSequenceSchema.omit({ id: true });
