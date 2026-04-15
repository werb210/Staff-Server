import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAuthorization } from "../middleware/auth.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { ROLES } from "../auth/roles.js";
import { AppError } from "../middleware/errors.js";
import { dbQuery } from "../db.js";
import { logCrmEvent } from "../modules/crm/crmTimeline.service.js";

const router = Router();
router.use(requireAuth);
router.use(requireAuthorization({ roles: [ROLES.ADMIN, ROLES.STAFF] }));

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  body: z.string().min(1),
  fromInbox: z.enum(["personal", "shared"]),
  crmContactId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
});

router.post(
  "/send",
  safeHandler(async (req: any, res: any) => {
    const parsed = sendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError("validation_error", "Invalid email payload.", 400);
    }

    const { to, subject, body, fromInbox, crmContactId, applicationId } = parsed.data;

    const staffResult = await dbQuery<{ o365_user_email: string | null; o365_access_token: string | null }>(
      `select o365_user_email, o365_access_token from users where id = $1 limit 1`,
      [req.user!.userId]
    );

    const staff = staffResult.rows[0];
    if (!staff?.o365_access_token) {
      throw new AppError("not_configured", "O365 not configured for this user.", 422);
    }

    const senderEmail = fromInbox === "shared"
      ? process.env.O365_SHARED_INBOX_EMAIL
      : staff.o365_user_email;

    if (!senderEmail) {
      throw new AppError("not_configured", "Sender inbox is not configured.", 422);
    }

    const graphUrl = fromInbox === "shared"
      ? `https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`
      : "https://graph.microsoft.com/v1.0/me/sendMail";

    const response = await fetch(graphUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${staff.o365_access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: body },
          toRecipients: [{ emailAddress: { address: to } }],
        },
      }),
    });

    if (!response.ok) {
      throw new AppError("email_send_failed", "Failed to send email via O365.", 502);
    }

    if (crmContactId) {
      await logCrmEvent({
        contactId: crmContactId,
        applicationId: applicationId ?? null,
        eventType: "email_sent",
        payload: { to, subject, fromInbox, senderEmail },
        actorUserId: req.user?.userId,
      });
    }

    res.status(200).json({ ok: true });
  })
);

export default router;
