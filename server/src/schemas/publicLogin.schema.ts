import { z } from "zod";

export const ClientPortalSignInSchema = z
  .object({
    applicationId: z.string().uuid().optional(),
    applicantEmail: z.string().email().optional(),
  })
  .refine(
    (value) => Boolean(value.applicationId) || Boolean(value.applicantEmail),
    {
      message: "Provide an applicationId or applicantEmail",
      path: ["applicationId"],
    },
  );

export const ClientPortalQuerySchema = z.object({
  applicationId: z.string().uuid(),
});

export const ClientPortalSessionSchema = z.object({
  applicationId: z.string().uuid(),
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  status: z.string(),
  redirectUrl: z.string().min(1),
  nextStep: z.string().min(1),
  updatedAt: z.string().min(1),
  silo: z.string().min(1),
  message: z.string().min(1),
});

export type ClientPortalSession = z.infer<typeof ClientPortalSessionSchema>;
export type ClientPortalSignInInput = z.infer<typeof ClientPortalSignInSchema>;
