module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/server/src/__tests__"],
  moduleFileExtensions: ["ts", "js"],
  clearMocks: true
};
