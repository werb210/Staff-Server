import { Router, type Request } from "express";
import { loginUser } from "./auth.service";
import {
  type AuthLoginErrorResponse,
  type AuthLoginRequestBody,
  type AuthLoginResponse,
} from "./auth.types";

const router = Router();

router.post(
  "/login",
  async (
    req: Request<unknown, AuthLoginResponse | AuthLoginErrorResponse, AuthLoginRequestBody>,
    res,
  ) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "missing_fields" });
    }

    const user = await loginUser(email, password);

    if (!user) {
      return res.status(401).json({ error: "invalid_credentials" });
    }

    return res.json({ id: user.id, email: user.email });
  },
);

export default router;
