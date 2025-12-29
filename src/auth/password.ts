import crypto from "crypto";

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export function hashPasswordSync(password: string): string {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const derivedKey = crypto
    .scryptSync(password, salt, KEY_LENGTH)
    .toString("hex");
  return `${salt}:${derivedKey}`;
}

export async function hashPassword(password: string): Promise<string> {
  return hashPasswordSync(password);
}

export async function comparePassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  const [salt, storedHash] = passwordHash.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = crypto
    .scryptSync(password, salt, KEY_LENGTH)
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(storedHash, "hex"),
    Buffer.from(derivedKey, "hex"),
  );
}
