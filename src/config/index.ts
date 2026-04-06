export const config = {
  env: (process.env.NODE_ENV as "production" | "development" | "test") || "development",
  isProd: process.env.NODE_ENV === "production",
  isTest: process.env.NODE_ENV === "test",
  port: Number(process.env.PORT || 3000),

  jwtSecret: process.env.JWT_SECRET || "dev",

  db: {
    url: process.env.DB_URL || "",
    ssl: process.env.DB_SSL === "true",
    skip: process.env.DB_SKIP === "true",
    host: process.env.DB_HOST || "",
  },

  redis: {
    url: process.env.REDIS_URL || "",
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || "",
    authToken: process.env.TWILIO_AUTH_TOKEN || "",
    verifyServiceSid: process.env.TWILIO_VERIFY_SID || "",
    phoneNumber: process.env.TWILIO_PHONE_NUMBER || "",
    apiKey: process.env.TWILIO_API_KEY || "",
    apiSecret: process.env.TWILIO_API_SECRET || "",
    voiceAppSid: process.env.TWILIO_VOICE_APP_SID || "",
    from: process.env.TWILIO_PHONE_NUMBER || "",
    number: process.env.TWILIO_PHONE_NUMBER || "",
    phone: process.env.TWILIO_PHONE_NUMBER || "",
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || "",
  },

  azureOpenai: {
    apiKey: process.env.AZURE_OPENAI_KEY || "",
    endpoint: process.env.AZURE_OPENAI_ENDPOINT || "",
  },

  ai: {
    model: process.env.AI_MODEL || "gpt-4",
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || "dev",
  },

  app: {
    url: process.env.APP_URL || "",
  },

  google: {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL || "",
    privateKey: process.env.GOOGLE_PRIVATE_KEY || "",
    sheetId: process.env.GOOGLE_SHEET_ID || "",
  },

  ocr: {
    provider: process.env.OCR_PROVIDER || "",
  },

  flags: {},

  client: {},
  portal: {},
  website: {},
  internal: {},

  security: {},

  telemetry: {},
  alerting: {},

  lender: {},
  documents: {},
  intake: {},
  crm: {},
  pwa: {},
  codespaces: {},

  commitSha: process.env.COMMIT_SHA || "",
  buildTimestamp: process.env.BUILD_TIMESTAMP || "",

  logLevel: process.env.LOG_LEVEL || "info",
};
