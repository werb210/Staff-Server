import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",

  // Look for test files inside server/src or server/tests
  roots: ["<rootDir>/src", "<rootDir>/tests"],

  // Ensure ts-jest uses the special Jest TS config
  globals: {
    "ts-jest": {
      tsconfig: "<rootDir>/tsconfig.jest.json"
    }
  },

  moduleFileExtensions: ["ts", "js", "json"],
  modulePaths: ["<rootDir>"],

  // Ignore build output
  testPathIgnorePatterns: ["/dist/"],

  // Allow imports like "utils/foo" inside server/
  moduleNameMapper: {
    "^(.*)$": "<rootDir>/$1"
  }
};

export default config;
