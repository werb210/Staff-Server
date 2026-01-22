export type AuthRole = "Admin" | "Staff" | "Lender" | "Referrer";

export interface AuthUserBase {
  id: string;
  role: AuthRole;
}

export interface AuthUserWithContact extends AuthUserBase {
  phone?: string;
  email?: string;
}

export interface AuthOtpStartRequest {
  phone: string;
}

export type AuthOtpStartResponse = void;

export interface AuthOtpVerifyRequest {
  phone: string;
  code: string;
}

export interface AuthOtpVerifySuccessResponse {
  token: string;
  user: AuthUserWithContact;
}

export type AuthOtpVerifyResponse = AuthOtpVerifySuccessResponse | void;

export interface AuthMeResponse {
  ok: true;
  userId: string;
  role: AuthRole;
  silo: string;
}

export type NoContentResponse = void;

export type SuccessResponse<TResponse> = Exclude<TResponse, NoContentResponse>;

export type AuthOtpVerifySuccess = SuccessResponse<AuthOtpVerifyResponse>;
