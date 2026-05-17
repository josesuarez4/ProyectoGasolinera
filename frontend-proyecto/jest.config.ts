import type { Config } from 'jest';

const config: Config = {
  preset: "jest-preset-angular",
  setupFilesAfterEnv: ["<rootDir>/src/setup-jest.ts"],
  moduleDirectories: ["node_modules", "<rootDir>"],
  testMatch: ["**/+(*.)+(spec).+(ts)"],
  // Agrega esta línea:
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$|@stomp/.*|@angular/common.*)']
};

export default config;