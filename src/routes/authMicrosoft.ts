import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { safeHandler } from "../middleware/safeHandler.js";
import { AppError } from "../middleware/errors.js";
import { dbQuery } from "../db.js";

const router = Router();
router.use(requireAuth);

router.post(
  "/microsoft",
  safeHandler(async (req: any, res: any) => {
    const { accessToken, accountEmail } = req.body as {
      accessToken?: string;
      accountEmail?: string;
    };

    if (!accessToken) {
      throw new AppError("validation_error", "accessToken is required.", 400);
    }

    const graphRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!graphRes.ok) {
      throw new AppError("invalid_token", "Microsoft token is invalid.", 401);
    }

    const profile = (await graphRes.json()) as { mail?: string; userPrincipalName?: string };
    const email = profile.mail ?? profile.userPrincipalName ?? accountEmail ?? "";

    // BF_O365_DUAL_EXPIRY_v38 — Block 38-B — write both legacy
    // (o365_token_expires_at, mig 027) and current
    // (o365_access_token_expires_at, mig 137) expiry columns so /me and
    // /o365-status both find a non-null expiry.
    await dbQuery(
      `UPDATE users
          SET o365_user_email = $1,
              o365_access_token = $2,
              o365_token_expires_at        = now() + interval '1 hour',
              o365_access_token_expires_at = now() + interval '1 hour'
        WHERE id = $3`,
      [email, accessToken, req.user!.userId]
    );

    res.status(200).json({ ok: true, email, connected: true });
  })
);

export default router;
