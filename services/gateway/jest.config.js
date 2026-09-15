/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@proxy/(.*)$': '<rootDir>/src/proxy/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  clearMocks: true,
};
