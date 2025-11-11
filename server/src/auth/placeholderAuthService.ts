import type { AuthService, AuthSession, PasskeyAssertionInput, SiloKey } from "../silos/types.js";

export class PlaceholderAuthService implements AuthService {
  private readonly silo: SiloKey;

  constructor(silo: SiloKey) {
    this.silo = silo;
  }

  public describe() {
    return {
      mode: "placeholder" as const,
      message: `Placeholder authentication for ${this.silo}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public ensureAuthenticated(
    _headers?: Record<string, string | string[] | undefined>,
  ): AuthSession {
    return this.buildSession();
  }

  public loginWithPasskey(_assertion: PasskeyAssertionInput): AuthSession {
    return this.buildSession();
  }

  private buildSession(): AuthSession {
    return {
      userId: "placeholder",
      email: "placeholder@example.com",
      silo: this.silo,
      issuedAt: new Date().toISOString(),
      token: "placeholder-token",
      scopes: ["read"],
    };
  }
}
