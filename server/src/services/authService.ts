import bcrypt from "bcryptjs";
import usersRepo from "../db/repositories/users.repo.js";
import { tokenService } from "./tokenService.js";

export const authService = {
  async login(email: string, password: string) {
    const user = await usersRepo.findOne({ email });
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    return {
      user,
      token: tokenService.issue(user),
    };
  },

  async getByEmail(email: string) {
    return usersRepo.findOne({ email });
  },
};

export default authService;
