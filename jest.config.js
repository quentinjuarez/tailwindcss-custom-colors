module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleFileExtensions: ["js", "ts", "json"],
  testMatch: ["**/test/**/*.test.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
