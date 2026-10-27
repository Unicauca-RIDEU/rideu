/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/**/*.test.js",
    "!src/server.js",
    "!src/db/**",
    "!src/config/database.js",
  ],
  coverageThreshold: {
    "./src/validation/": {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    "./src/controllers/": {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    "./src/models/": {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
    "./src/services/": {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
    "./src/middleware/": {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "json-summary"],
  clearMocks: true,
  restoreMocks: true,
  resetModules: true,
  verbose: true,
};
