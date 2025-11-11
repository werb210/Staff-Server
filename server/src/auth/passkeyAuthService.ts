import { createHmac } from "crypto";
import { PasskeyAssertionInput, type AuthService, type AuthSession, type SiloKey } from "../silos/types.js";

export interface RegisteredPasskey {
  userId: string;
  email: string;
  credentialId: string;
  publicKey: string;
  scopes?: ReadonlyArray<string>;
}

export interface PasskeyAuthOptions {
  silo: SiloKey;
  secret: string;
  users: ReadonlyArray<RegisteredPasskey>;
}

interface StoredSession extends AuthSession {
  expiresAt: number;
}

export class PasskeyAuthService implements AuthService {
  private readonly sessions = new Map<string, StoredSession>();
  private readonly options: PasskeyAuthOptions;

  constructor(options: PasskeyAuthOptions) {
    this.options = {
      ...options,
      users: options.users.map((user) => ({ ...user })),
    };
  }

  public describe() {
    return {
      mode: "passkey" as const,
      message: `WebAuthn-enabled authentication for ${this.options.silo}`,
    };
  }

  public ensureAuthenticated(
    headers: Record<string, string | string[] | undefined>,
  ): AuthSession {
    const authorization = headers.authorization ?? headers.Authorization;
    if (typeof authorization !== "string") {
      throw new Error("Authorization header missing");
    }
    const [, token] = authorization.split(" ");
    if (!token) {
      throw new Error("Authorization token missing");
    }

    const session = this.sessions.get(token);
    if (!session) {
      throw new Error("Invalid or expired session");
    }
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      throw new Error("Session expired");
    }
    return session;
  }

  public loginWithPasskey(assertion: PasskeyAssertionInput): AuthSession {
    const user = this.options.users.find(
      (candidate) => candidate.credentialId === assertion.credentialId,
    );
    if (!user) {
      throw new Error("Unknown credential");
    }

    const expected = createHmac("sha256", `${user.publicKey}:${this.options.secret}`)
      .update(assertion.challenge)
      .digest("hex");

    if (expected !== assertion.signature) {
      throw new Error("Passkey signature mismatch");
    }

    const token = Buffer.from(
      JSON.stringify({
        sub: user.userId,
        email: user.email,
        silo: this.options.silo,
        ts: Date.now(),
      }),
      "utf-8",
    ).toString("base64url");

    const session: StoredSession = {
      userId: user.userId,
      email: user.email,
      silo: this.options.silo,
      issuedAt: new Date().toISOString(),
      token,
      scopes: Array.from(user.scopes ?? ["read", "write"]),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };
    this.sessions.set(token, session);
    return session;
  }
}
