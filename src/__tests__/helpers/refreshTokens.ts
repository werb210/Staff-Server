import { createHash, randomBytes } from "crypto";
import jwt, { type SignOptions } from "jsonwebtoken";
import { getRefreshTokenExpiresIn } from "../../config";
import { findAuthUserById, storeRefreshToken } from "../../modules/auth/auth.repo";

function msToSeconds(value: string): number {
  if (value.endsWith("ms")) {
    return Math.floor(Number(value.replace("ms", "")) / 1000);
  }
  const unit = value.slice(-1);
  const amount = Number(value.slice(0, -1));
  if (Number.isNaN(amount)) {
    return 0;
  }
  switch (unit) {
    case "s":
      return amount;
    case "m":
      return amount * 60;
    case "h":
      return amount * 60 * 60;
    case "d":
      return amount * 60 * 60 * 24;
    default:
      return amount;
  }
}

export async function issueRefreshTokenForUser(userId: string): Promise<string> {
  const user = await findAuthUserById(userId);
  if (!user) {
    throw new Error("User not found for refresh token.");
  }
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error("JWT_REFRESH_SECRET is not configured.");
  }
  const options: SignOptions = {
    expiresIn: getRefreshTokenExpiresIn() as SignOptions["expiresIn"],
  };
  const refreshPayload = {
    userId: user.id,
    role: user.role,
    tokenVersion: user.token_version,
    tokenId: randomBytes(16).toString("hex"),
  };
  const refreshToken = jwt.sign(refreshPayload, secret, options);
  const tokenHash = createHash("sha256").update(refreshToken).digest("hex");
  const refreshExpires = new Date();
  refreshExpires.setSeconds(
    refreshExpires.getSeconds() + msToSeconds(getRefreshTokenExpiresIn())
  );
  await storeRefreshToken({
    userId: user.id,
    tokenHash,
    expiresAt: refreshExpires,
  });
  return refreshToken;
}
