/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/tests/**/*.spec.ts'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@api/(.*)$': '<rootDir>/src/api/$1',
    '^@common/(.*)$': '<rootDir>/src/common/$1',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/**/*.entity.ts', '!src/infrastructure/database/migrations/**'],
  setupFiles: ['<rootDir>/tests/setup-env.ts'],
  clearMocks: true,
};
