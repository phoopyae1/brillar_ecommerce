module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  modulePathIgnorePatterns: ["dist"],
  moduleNameMapper: {
    "^@brillar/shared(.*)$": "<rootDir>/../../packages/shared/src$1"
  }
};
