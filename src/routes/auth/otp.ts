import { Router } from "express";
import { startOtp, verifyOtpCode } from "../../modules/auth/otp.service";

const router = Router();

router.post("/start", async (req, res, next) => {
  try {
    const { phone } = req.body ?? {};
    await startOtp(phone);
    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

router.post("/verify", async (req, res, next) => {
  try {
    const { phone, code } = req.body ?? {};
    const result = await verifyOtpCode({
      phone,
      code,
      ip: req.ip,
      userAgent: req.get("user-agent"),
      route: req.originalUrl,
      method: req.method,
    });
    return res.status(200).json({
      ok: true,
      accessToken: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
