import { vi } from "vitest";

process.env.NODE_ENV = "test";
process.env.PORT ||= "3000";
process.env.TWILIO_MODE ||= "mock";
process.env.BASE_URL ||= "http://127.0.0.1:3000";
process.env.RUN_MIGRATIONS = "false";
process.env.DB_READY_ATTEMPTS = "1";
process.env.DB_READY_BASE_DELAY_MS = "1";
process.env.TWILIO_ACCOUNT_SID ||= "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env.TWILIO_AUTH_TOKEN ||= "test-auth-token-1234567890";
process.env.TWILIO_VERIFY_SERVICE_SID ||= "VA00000000000000000000000000000000";
process.env.TWILIO_API_KEY ||= "SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env.TWILIO_API_SECRET ||= "test-twilio-api-secret";
process.env.TWILIO_TWIML_APP_SID ||= "AP00000000000000000000000000000000";
process.env.TWILIO_PHONE_NUMBER ||= "+14155550000";
process.env.JWT_SECRET ||= "test-access-secret";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret";
process.env.ACCESS_TOKEN_SECRET ||= "test-secret";
process.env.REFRESH_TOKEN_SECRET ||= "test-refresh";
process.env.VAPID_PUBLIC_KEY ||= "test-vapid-public-key";
process.env.VAPID_PRIVATE_KEY ||= "test-vapid-private-key";
process.env.VAPID_SUBJECT ||= "mailto:tests@example.com";

const { installProcessHandlers } = await import("../observability/processHandlers");
const { markReady } = await import("../startupState");
const { setupTestDatabase } = await import("../test/db");

markReady();
installProcessHandlers();
setupTestDatabase();

vi.mock("twilio", () => {
  const state = { lastServiceSid: null as string | null };
  const createVerification = vi.fn(async () => ({ sid: "VE123", status: "pending" }));
  const createVerificationCheck = vi.fn(async () => ({ sid: "VC123", status: "approved" }));
  const services = vi.fn((serviceSid: string) => {
    state.lastServiceSid = serviceSid;
    return {
      verifications: { create: createVerification },
      verificationChecks: { create: createVerificationCheck },
    };
  });
  const createCall = vi.fn(async () => ({ sid: "CA123", status: "queued" }));
  const updateCall = vi.fn(async (callSid?: string, params?: { status?: string }) => ({
    sid: callSid ?? "CA123",
    status: params?.status ?? "completed",
  }));
  const calls = Object.assign(
    (callSid?: string) => ({ update: (params: { status?: string }) => updateCall(callSid, params) }),
    { create: createCall }
  );

  const twilioConstructor = vi.fn(() => ({ verify: { v2: { services } }, calls }));

  (globalThis as typeof globalThis & { __twilioMocks?: unknown }).__twilioMocks = {
    createVerification,
    createVerificationCheck,
    createCall,
    updateCall,
    twilioConstructor,
    services,
    get lastServiceSid() {
      return state.lastServiceSid;
    },
  };

  return {
    default: twilioConstructor,
    jwt: {
      AccessToken: class {
        constructor(
          _accountSid: string,
          _apiKey: string,
          _apiSecret: string,
          _opts?: { identity?: string; ttl?: number }
        ) {}
        addGrant(_grant: unknown): void {}
        toJwt(): string {
          return "voice-token-mock";
        }
        static VoiceGrant = class {
          constructor(_opts: { outgoingApplicationSid: string }) {}
        };
      },
    },
  };
});
