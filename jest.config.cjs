const isCI = process.env.CI === "true" || process.env.CI === "1";

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  maxWorkers: "50%",
  setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
  testTimeout: 30000,
  verbose: false,
  silent: isCI,
  detectOpenHandles: isCI,
  forceExit: false,
};
