// server/src/controllers/authController.ts
import bcrypt from "bcryptjs";
import { Request, Response } from "express";
import usersRepo from "../db/repositories/users.repo.js";
import asyncHandler from "../utils/asyncHandler.js";
import { tokenService } from "../services/tokenService.js";
import { sanitizeUser } from "../utils/sanitizeUser.js";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await usersRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = tokenService.issue(user);

    return res.json({
      token,
      user: sanitizeUser(user),
    });
  }),
};

export default authController;
