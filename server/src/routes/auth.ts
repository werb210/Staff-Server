import { Router } from "express";
import { z } from "zod";
import { isPlaceholderSilo } from "../utils/placeholder.js";

const PasskeyLoginSchema = z.object({
  credentialId: z.string().min(1),
  challenge: z.string().min(1),
  signature: z.string().min(1),
});

const router = Router();

router.post("/passkey", (req, res) => {
  if (!req.silo) {
    return res.status(500).json({ message: "Silo context missing" });
  }

  if (isPlaceholderSilo(req)) {
    return res.json({
      message: "Placeholder",
      session: req.silo.auth.loginWithPasskey({
        credentialId: "placeholder",
        challenge: "placeholder",
        signature: "placeholder",
      }),
    });
  }

  const parsed = PasskeyLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid passkey assertion" });
  }

  try {
    const session = req.silo.auth.loginWithPasskey(parsed.data);
    res.json({ message: "OK", session });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to login";
    res.status(401).json({ message });
  }
});

export default router;
