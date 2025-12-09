import bcrypt from "bcryptjs";

const TOKEN_SALT_ROUNDS = 10;
const PASSWORD_SALT_ROUNDS = 12;

export const passwordService = {
  async hashPassword(password: string) {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  },

  async verifyPassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  },

  async hashToken(token: string) {
    return bcrypt.hash(token, TOKEN_SALT_ROUNDS);
  },

  async verifyToken(token: string, hash: string) {
    return bcrypt.compare(token, hash);
  },
};
