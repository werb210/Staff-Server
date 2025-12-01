import bcrypt from "bcrypt";
import { Request, Response } from "express";
import usersRepo from "../db/repositories/users.repo.js";
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "../utils/jwt.js";
import sanitizeUser from "../utils/sanitizeUser.js";

export const authController = {
  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const user = await usersRepo.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user.id });
    res.json({ token, user: sanitizeUser(user) });
  }),
};

export default authController;
