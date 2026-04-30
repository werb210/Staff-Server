// BF_SERVER_v75_BLOCK_1_8 — Option-B Pending Acceptance routes.
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// Client (or staff acting as client): stage an offer for acceptance.
router.post("/:id/accept", async (req, res) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) return res.status(400).json({ error: "missing_offer_id" });

  const r = await pool.query<{ id: string; status: string }>(
    `UPDATE offers
        SET status = 'pending_acceptance',
            pending_at = NOW()
      WHERE id::text = $1
        AND status NOT IN ('accepted','declined','expired')
      RETURNING id, status`,
    [id]
  );
  const row = r.rows[0];
  if (!row) return res.status(409).json({ error: "offer_not_acceptable" });

  return res.json({ ok: true, offer: row });
});

// Staff confirms acceptance — flips to accepted + fires lender SignNow.
router.post("/:id/confirm-acceptance", async (req, res) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) return res.status(400).json({ error: "missing_offer_id" });

  const r = await pool.query<{
    id: string;
    application_id: string;
    lender_id: string | null;
    status: string;
  }>(
    `UPDATE offers
        SET status = 'accepted',
            accepted_at = NOW()
      WHERE id::text = $1
        AND status = 'pending_acceptance'
      RETURNING id, application_id::text AS application_id, lender_id::text AS lender_id, status`,
    [id]
  );
  const row = r.rows[0];
  if (!row) return res.status(409).json({ error: "offer_not_pending" });

  // Fire SignNow envelope on the lender's term sheet (best-effort).
  try {
    const pth = "../services/signnow/sendOfferTermSheet.js";
    const mod = await import(pth).catch(() => null as any);
    if (mod && typeof (mod as any).sendOfferTermSheet === "function") {
      await (mod as any).sendOfferTermSheet({ pool, offerId: row.id });
    } else {
      // eslint-disable-next-line no-console
      console.log(`[offer] would fire SignNow on term sheet for offer=${row.id}`);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[offer] signnow fire failed", e);
  }

  return res.json({ ok: true, offer: row });
});

// Decline path — staff or client.
router.post("/:id/decline", async (req, res) => {
  const id = String(req.params.id ?? "").trim();
  if (!id) return res.status(400).json({ error: "missing_offer_id" });
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 1000) : null;

  const r = await pool.query<{ id: string; status: string }>(
    `UPDATE offers
        SET status = 'declined',
            declined_at = NOW(),
            decline_reason = $2
      WHERE id::text = $1
        AND status NOT IN ('accepted','declined','expired')
      RETURNING id, status`,
    [id, reason]
  );
  const row = r.rows[0];
  if (!row) return res.status(409).json({ error: "offer_not_declinable" });

  return res.json({ ok: true, offer: row });
});

export default router;
