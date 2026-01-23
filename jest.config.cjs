const isCI = process.env.CI === "true" || process.env.CI === "1";

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: [
    "<rootDir>/tests/**/*.test.ts",
    "<rootDir>/tests/**/*.spec.ts",
    "<rootDir>/src/tests/**/*.test.ts",
    "<rootDir>/src/__tests__/int.routes.test.ts",
  ],
  clearMocks: true,
  moduleNameMapper: {
    "^twilio$": "<rootDir>/tests/__mocks__/twilio.ts",
  },
  maxWorkers: "50%",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  testTimeout: 30000,
  verbose: false,
  silent: isCI,
  detectOpenHandles: isCI,
  forceExit: false,
};
