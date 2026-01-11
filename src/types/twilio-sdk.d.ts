declare module "twilio" {
  import type { ClientOpts } from "twilio/lib/base/BaseTwilio";
  import type Twilio from "twilio/lib/rest/Twilio";

  interface TwilioSDK {
    (accountSid?: string, authToken?: string, opts?: ClientOpts): Twilio;
    new (accountSid?: string, authToken?: string, opts?: ClientOpts): Twilio;
  }

  const twilio: TwilioSDK;
  export default twilio;
}
