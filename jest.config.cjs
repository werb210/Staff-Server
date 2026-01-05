module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  clearMocks: true,
  maxWorkers: 1,
  setupFiles: ["<rootDir>/src/__tests__/setup.ts"],
  testTimeout: 30000,
};
