/**
 * Jest E2E Test Setup
 * 
 * This file is executed before E2E tests run.
 * Use it to:
 * - Start test database
 * - Seed initial test data
 * - Set environment variables
 * - Initialize test fixtures
 */

// Ensure test environment
process.env.NODE_ENV = 'test';

// PostgreSQL test database URL (use default if not provided)
// For local development: postgres://user:password@localhost:5432/ecommerce_test
// For CI/CD: use environment variable
process.env.DATABASE_URL = 
  process.env.DATABASE_URL || 
  'postgresql://postgres:postgres@localhost:5432/ecommerce_test' ||
  'file:./prisma/test.db';

// Payment API configuration for tests
process.env.PAYMENT_API_URL = process.env.PAYMENT_API_URL || 'http://localhost:3002';
process.env.PAYMENT_API_KEY = process.env.PAYMENT_API_KEY || 'ecommerce-api-key-12345';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-12345';

// Set test timeout
jest.setTimeout(60000);

// Suppress console logs during tests (optional, comment out to see logs)
if (process.env.VERBOSE !== 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
  } as any;
}

export {};
