import { createHash, createHmac, timingSafeEqual } from "crypto";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface UserRecord extends AuthenticatedUser {
  passwordHash: string;
}

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  role?: string;
  iat: number;
  exp: number;
}

const USERS: UserRecord[] = [
  {
    id: "bf-user-1",
    email: "olivia.ops@bf.example",
    name: "Olivia Operations",
    role: "manager",
    passwordHash: hashPassword("Password123!"),
  },
  {
    id: "bf-user-2",
    email: "mason.analyst@bf.example",
    name: "Mason Analyst",
    role: "agent",
    passwordHash: hashPassword("SecurePass456!"),
  },
  {
    id: "slf-user-1",
    email: "sam.ops@slf.example",
    name: "Sam Lending",
    role: "manager",
    passwordHash: hashPassword("SLFpass789!"),
  },
];

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function base64UrlEncode(value: Buffer | string): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized.padEnd(normalized.length + (4 - padding), "=");
  return Buffer.from(padded, "base64");
}

function buildSignature(input: string, secret: string): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(input);
  return base64UrlEncode(hmac.digest());
}

export function generateAccessToken(
  user: AuthenticatedUser,
  secret: string,
  expiresInSeconds = 60 * 60,
): string {
  const header = base64UrlEncode(
    JSON.stringify({
      alg: "HS256",
      typ: "JWT",
    }),
  );

  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = base64UrlEncode(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      iat: issuedAt,
      exp: issuedAt + expiresInSeconds,
    }),
  );

  const signature = buildSignature(`${header}.${payload}`, secret);
  return `${header}.${payload}.${signature}`;
}

export function verifyAccessToken(token: string, secret: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token structure");
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const expectedSignature = buildSignature(`${headerPart}.${payloadPart}`, secret);

  const signatureBuffer = base64UrlToBuffer(signaturePart);
  const expectedBuffer = base64UrlToBuffer(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Token signature mismatch");
  }

  const headerJson = base64UrlDecode(headerPart);
  const header = JSON.parse(headerJson) as { alg: string; typ: string };
  if (header.alg !== "HS256" || header.typ !== "JWT") {
    throw new Error("Unsupported token");
  }

  const payloadJson = base64UrlDecode(payloadPart);
  const payload = JSON.parse(payloadJson) as JwtPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error("Token expired");
  }

  return payload;
}

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthenticatedUser | null> {
  const normalizedEmail = normalizeEmail(email);
  const user = USERS.find((candidate) => normalizeEmail(candidate.email) === normalizedEmail);
  if (!user) {
    return null;
  }

  const hashed = hashPassword(password);
  if (user.passwordHash !== hashed) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export async function getUserById(id: string): Promise<AuthenticatedUser | null> {
  const user = USERS.find((candidate) => candidate.id === id);
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export type { JwtPayload };
