import { installProcessHandlers } from "../observability/processHandlers";
import { setCriticalServicesReady, setDbConnected, setMigrationsState, setSchemaReady } from "../startupState";
import type { ClientOpts } from "twilio/lib/base/BaseTwilio";
import type {
  VerificationInstance,
  VerificationListInstanceCreateOptions,
} from "twilio/lib/rest/verify/v2/service/verification";
import type {
  VerificationCheckInstance,
  VerificationCheckListInstanceCreateOptions,
} from "twilio/lib/rest/verify/v2/service/verificationCheck";

process.env.NODE_ENV = "test";
process.env.RUN_MIGRATIONS = "false";
process.env.DB_READY_ATTEMPTS = "1";
process.env.DB_READY_BASE_DELAY_MS = "1";
process.env.TWILIO_ACCOUNT_SID = "ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
process.env.TWILIO_AUTH_TOKEN = "test-auth-token";
process.env.TWILIO_VERIFY_SERVICE_SID = "VA00000000000000000000000000000000";
process.env.TWILIO_PHONE_NUMBER = "+15555550100";
process.env.TWILIO_CALLER_ID = "+15555550101";
process.env.TWILIO_TWIML_APP_SID = "AP00000000000000000000000000000000";

setDbConnected(true);
setMigrationsState([]);
setSchemaReady(true);
setCriticalServicesReady(true);
installProcessHandlers();

const createVerification = jest.fn<
  Promise<Pick<VerificationInstance, "sid" | "status">>,
  [VerificationListInstanceCreateOptions]
>(async () => ({ sid: "VE123", status: "pending" }));

const createVerificationCheck = jest.fn<
  Promise<Pick<VerificationCheckInstance, "status">>,
  [VerificationCheckListInstanceCreateOptions]
>(async (params) => ({
  status: params.code === "123456" ? "approved" : "pending",
}));

type VerificationService = {
  verifications: {
    create: typeof createVerification;
  };
  verificationChecks: {
    create: typeof createVerificationCheck;
  };
};

type TwilioClientMock = {
  verify: {
    v2: {
      services: (serviceSid: string) => VerificationService;
    };
  };
};

const mockService: VerificationService = {
  verifications: { create: createVerification },
  verificationChecks: { create: createVerificationCheck },
};

const mockClient: TwilioClientMock = {
  verify: {
    v2: {
      services: jest.fn(() => mockService),
    },
  },
};

const TwilioMock = jest.fn<
  TwilioClientMock,
  [string | undefined, string | undefined, ClientOpts | undefined]
>(() => mockClient);

jest.mock("twilio", () => ({
  __esModule: true,
  default: TwilioMock,
}));

type TwilioMockState = {
  createVerification: typeof createVerification;
  createVerificationCheck: typeof createVerificationCheck;
  twilioConstructor: typeof TwilioMock;
};

const twilioMockState: TwilioMockState = {
  createVerification,
  createVerificationCheck,
  twilioConstructor: TwilioMock,
};

Object.assign(globalThis, { __twilioMocks: twilioMockState });
