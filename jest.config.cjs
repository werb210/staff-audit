/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { isolatedModules: true } }] },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
  testMatch: ['**/server/tests/**/*.test.ts'],
  verbose: true,
  maxWorkers: 1
};