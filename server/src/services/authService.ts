import { usersRepo } from "../db/repositories/users.repo";
import { tokenService } from "./tokenService";
import bcrypt from "bcryptjs";

export const authService = {
  async login(email: string, password: string) {
    const user = await usersRepo.findByEmail(email);
    if (!user) return null;

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;

    return tokenService.issue(user);
  },

  async verify(email: string) {
    return usersRepo.findByEmail(email);
  }
};
