import { z } from "zod";

export const AdCampaignSchema = z.object({
  id: z.string().uuid(),
  channel: z.enum(["google", "facebook", "linkedin"]),
  budget: z.number().nonnegative(),
  status: z.enum(["active", "paused", "draft"]),
});

export const AutomationWorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  trigger: z.string().min(1),
  status: z.enum(["enabled", "disabled"]),
});

export const CreateAdSchema = AdCampaignSchema.omit({ id: true }).extend({
  name: z.string().min(1),
});

export const UpdateAutomationSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["enabled", "disabled"]).optional(),
});
