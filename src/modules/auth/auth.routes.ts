import { Router, type Request } from "express";
import { loginUser } from "./auth.service";
import {
  type AuthLoginErrorResponse,
  type AuthLoginRequestBody,
  type AuthLoginResponse,
} from "./auth.types";

const router = Router();

router.post(
  "/api/auth/login",
  async (
    req: Request<unknown, AuthLoginResponse | AuthLoginErrorResponse, AuthLoginRequestBody>,
    res,
  ) => {
    const result = await loginUser(req.body);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.json({ token: result.token });
  },
);

export default router;
