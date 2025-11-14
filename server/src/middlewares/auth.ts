import type { RequestHandler } from "express";

import { requireAuth } from "../auth/authMiddleware.js";

export const authMiddleware: RequestHandler = requireAuth;
