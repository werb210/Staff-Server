import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import { authConfig } from "../config/config";
import { TokenPayload } from "../auth/auth.types";

const algorithm: jwt.Algorithm = "HS256";
const accessSecret: Secret = authConfig.ACCESS_TOKEN_SECRET as Secret;
const refreshSecret: Secret = authConfig.REFRESH_TOKEN_SECRET as Secret;

export const jwtService = {
  signAccessToken(payload: TokenPayload) {
    return jwt.sign(payload as jwt.JwtPayload, accessSecret, {
      expiresIn: authConfig.ACCESS_TOKEN_EXPIRES_IN as unknown as jwt.SignOptions["expiresIn"],
      algorithm,
    });
  },

  signRefreshToken(payload: TokenPayload) {
    return jwt.sign(payload as jwt.JwtPayload, refreshSecret, {
      expiresIn: authConfig.REFRESH_TOKEN_EXPIRES_IN as unknown as jwt.SignOptions["expiresIn"],
      algorithm,
    });
  },

  verifyAccessToken(token: string) {
    return jwt.verify(token, accessSecret) as JwtPayload & TokenPayload;
  },

  verifyRefreshToken(token: string) {
    return jwt.verify(token, refreshSecret) as JwtPayload & TokenPayload;
  },

  decode(token: string) {
    return jwt.decode(token) as (JwtPayload & TokenPayload) | null;
  },
};
