export interface AuthLoginRequestBody {
  email?: string;
  password?: string;
}

export interface AuthLoginResponse {
  token: string;
}

export type AuthLoginError = "missing_fields" | "invalid_credentials";

export interface AuthLoginErrorResponse {
  error: AuthLoginError;
}

export interface AuthUserRecord {
  id: string;
  passwordHash: string;
}
