module.exports = {
  displayName: 'ecommerce-e2e',
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  // Run tests matching .mocked.e2e-spec.ts pattern (mocked tests that don't require services)
  testRegex: '.*\\.mocked\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/index.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest-e2e-setup.ts'],
  globalSetup: undefined,
  globalTeardown: undefined,
  testTimeout: 60000, // 60 seconds for E2E tests
  verbose: true,
  bail: false,
  // Handle async operations properly
  detectOpenHandles: false,
  // Prevent hanging
  forceExit: true,
};
