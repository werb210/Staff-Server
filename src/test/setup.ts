import { installProcessHandlers } from "../observability/processHandlers";
import { markReady } from "../startupState";
import { runMigrations as runCoreMigrations } from "../migrations";
import { runMigrations as runServerMigrations } from "../startup/runMigrations";
import { createOtpSessionsTable } from "../db/migrations/createOtpSessions";
import { vi } from "vitest";
import {
  getExpectedTwilioSignature,
  twilioDefaultExport,
  twilioMockState,
  validateExpressRequest,
  validateRequest,
} from "./twilioMock";

vi.mock("twilio", () => ({
  default: twilioDefaultExport,
  validateRequest,
  validateExpressRequest,
  getExpectedTwilioSignature,
  __twilioMocks: twilioMockState,
}));

process.env.NODE_ENV = "test";
process.env.BASE_URL ||= "http://127.0.0.1:3000";
process.env.RUN_MIGRATIONS = "false";
process.env.DB_READY_ATTEMPTS = "1";
process.env.DB_READY_BASE_DELAY_MS = "1";
process.env.TWILIO_ACCOUNT_SID = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env.TWILIO_AUTH_TOKEN = "test-auth-token-1234567890";
process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";
process.env.TWILIO_API_KEY = "SKXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env.TWILIO_API_SECRET = "test-twilio-api-secret";
process.env.TWILIO_VOICE_APP_SID = "AP00000000000000000000000000000000";
process.env.TWILIO_VOICE_CALLER_ID = "+14155550000";
process.env.JWT_SECRET = "test-access-secret";
process.env.TEST_OTP_CODE = "123456";

markReady();
installProcessHandlers();

let initialized = false;

beforeAll(async () => {
  if (initialized) {
    return;
  }

  const { pool } = await import("../db");


  await runCoreMigrations({
    ignoreMissingRelations: true,
    skipPlpgsql: true,
    rewriteAlterIfExists: true,
    rewriteCreateTableIfNotExists: true,
    skipPgMemErrors: true,
  });


  await runServerMigrations(pool);
  await createOtpSessionsTable();

  initialized = true;
});

Object.assign(globalThis, { __twilioMocks: twilioMockState });
