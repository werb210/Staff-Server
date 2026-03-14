const required = [
  "JWT_SECRET",
  "DATABASE_URL",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
];

required.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`Missing env variable ${variable}`);
  }
});

export {};
