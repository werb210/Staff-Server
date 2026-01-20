import type { ClientOpts } from "twilio/lib/base/BaseTwilio";
import type {
  VerificationInstance,
  VerificationListInstanceCreateOptions,
} from "twilio/lib/rest/verify/v2/service/verification";
import type {
  VerificationCheckInstance,
  VerificationCheckListInstanceCreateOptions,
} from "twilio/lib/rest/verify/v2/service/verificationCheck";

const createVerification = jest.fn<
  Promise<Pick<VerificationInstance, "sid" | "status">>,
  [VerificationListInstanceCreateOptions]
>(async () => ({ sid: "VE123", status: "pending" }));

const createVerificationCheck = jest.fn<
  Promise<Pick<VerificationCheckInstance, "status" | "sid">>,
  [VerificationCheckListInstanceCreateOptions]
>(async () => ({ status: "approved", sid: "VEXXXXX" }));

type VerificationService = {
  verifications: {
    create: typeof createVerification;
  };
  verificationChecks: {
    create: typeof createVerificationCheck;
  };
};

type ServicesMock = jest.MockedFunction<
  (serviceSid: string) => VerificationService
>;

type TwilioClientMock = {
  verify: {
    v2: {
      services: ServicesMock;
    };
  };
};

const mockService: VerificationService = {
  verifications: { create: createVerification },
  verificationChecks: { create: createVerificationCheck },
};

const twilioMockState = {
  createVerification,
  createVerificationCheck,
  lastServiceSid: null as string | null,
};

const services: ServicesMock = jest.fn((serviceSid: string) => {
  twilioMockState.lastServiceSid = serviceSid;
  return mockService;
});

const mockClient: TwilioClientMock = {
  verify: {
    v2: {
      services,
    },
  },
};

const TwilioMock = jest.fn<
  TwilioClientMock,
  [string | undefined, string | undefined, ClientOpts | undefined]
>(() => mockClient);

const twilioModule = Object.assign(TwilioMock, {
  default: TwilioMock,
  __twilioMocks: {
    ...twilioMockState,
    services,
    twilioConstructor: TwilioMock,
  },
});

export = twilioModule;
