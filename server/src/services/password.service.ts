import bcrypt from "bcryptjs";

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_SALT_ROUNDS = 12;

export class PasswordService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  }

  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, TOKEN_SALT_ROUNDS);
  }

  static async verifyToken(token: string, hash: string): Promise<boolean> {
    return bcrypt.compare(token, hash);
  }
}
