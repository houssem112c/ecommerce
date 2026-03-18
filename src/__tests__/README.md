# E2E Tests - Ecommerce and P2-Back Payment Integration

This directory contains comprehensive end-to-end tests for the payment integration between ecommerce and P2-Back.

## Test Files

### Ecommerce Tests

1. **`ecommerce-payment.e2e-spec.ts`**
   - Tests the complete user flow: registration → product browsing → cart management → order creation → payment
   - Covers authentication, product listing, cart operations, order creation, payment initiation, and webhook handling
   - Tests error scenarios: invalid credentials, empty carts, missing field validation

2. **`ecommerce-integration-complete-flow.e2e-spec.ts`**
   - End-to-end integration test of the complete order-to-payment flow
   - 7 phases: User registration → Product browsing → Order creation → Payment initiation → Proof submission → Webhook callback → Order fulfillment
   - Tests concurrent order handling, idempotency, error recovery
   - Validates stock management and payment status tracking

### P2-Back (Gateway) Tests

1. **`ecommerce-integration.e2e-spec.ts`**
   - Tests the P2-Back internal APIs used by ecommerce
   - Payment initiation, validation, webhook lifecycle management
   - API rate limiting, load testing, and security
   - Data consistency and idempotency verification

## Environment Setup

### Prerequisites

- Node.js 18+ and npm
- Both ecommerce and P2-Back services running (for integration tests)
- SQLite for test database (ecommerce uses Prisma with SQLite for testing)

### Installation

```bash
# In ecommerce directory
cd ecommerce
npm install

# In P2-Back directory
cd P2-Back
npm install
```

## Running Tests

### Ecommerce Tests

```bash
cd ecommerce

# Run all tests
npm test

# Run only E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ecommerce-payment.e2e-spec.ts
```

### P2-Back Tests

```bash
cd P2-Back

# Run all tests
npm test

# Run only E2E tests
npm run test:e2e

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- ecommerce-integration.e2e-spec.ts
```

## Test Configuration

### Ecommerce Jest Config

- **File**: `jest.config.js`
  - Preset: `ts-jest`
  - Environment: `node`
  - Timeout: 30 seconds (unit tests)
  - Test files: `**/*.spec.ts`

- **File**: `jest-e2e.config.js`
  - Preset: `ts-jest`
  - Environment: `node`
  - Timeout: 60 seconds (E2E tests)
  - Test files: `**/*.e2e-spec.ts`
  - Max workers: 1 (sequential execution)

### P2-Back Jest Config

- **File**: `jest-e2e.config.js`
  - Preset: `ts-jest`
  - Environment: `node`
  - Timeout: 60 seconds
  - Module name mapping for `@app/common`
  - Max workers: 1 (sequential execution)

## Test Database Setup

### Ecommerce (SQLite via Prisma)

The tests use an in-memory or file-based SQLite database defined in `.env.test`:

```env
DATABASE_URL="file:./prisma/test.db"
```

Run migrations for test database:

```bash
cd ecommerce
npm run prisma:migrate -- --name init --create-only  # Create migration
npm run prisma:migrate  # Run migrations
```

### P2-Back (Multiple databases per service)

Each microservice has its own database configured. E2E tests mock the database calls.

## Environment Variables

### Ecommerce

```bash
# .env.test (create if not exists)
NODE_ENV=test
DATABASE_URL=file:./prisma/test.db
PAYMENT_API_URL=http://localhost:3002
PAYMENT_API_KEY=test-api-key-12345
JWT_SECRET=test-secret-key
```

### P2-Back

```bash
# .env.test (create if not exists)
NODE_ENV=test
PAYMENT_API_KEY=test-api-key-12345
MOCK_SERVICES=true
```

## Test Scenarios Covered

### Authentication & Authorization
- ✅ User registration with valid/invalid data
- ✅ Login with correct/incorrect credentials
- ✅ API key validation
- ✅ JWT token generation and refresh
- ✅ Unauthorized access rejection

### Cart Management
- ✅ Add products to cart
- ✅ Update cart item quantities
- ✅ Remove items from cart
- ✅ Retrieve cart contents
- ✅ Cart subtotal calculation
- ✅ Insufficient stock handling

### Order Creation
- ✅ Create order from cart with valid data
- ✅ Create order with all required fields
- ✅ Reject order creation with missing fields
- ✅ Prevent order creation from empty cart
- ✅ Validate shipping address format
- ✅ Order total calculation

### Payment Processing
- ✅ Payment initiation with valid data
- ✅ Payment with manual proof submission
- ✅ Webhook-based payment confirmation
- ✅ Payment rejection handling
- ✅ Payment timeout handling
- ✅ Concurrent payment attempts
- ✅ Idempotent payment retry

### Data Validation
- ✅ Email format validation
- ✅ Amount validation (positive, non-zero)
- ✅ Currency validation
- ✅ URL format validation for webhooks
- ✅ Shipping address validation
- ✅ Screenshot URL validation

### Error Handling
- ✅ Missing required fields
- ✅ Invalid data types
- ✅ Service unavailability
- ✅ Database connection errors
- ✅ Timeout handling
- ✅ Concurrent request handling
- ✅ Duplicate order prevention
- ✅ No sensitive data in error responses

### Load & Performance
- ✅ Burst of concurrent requests
- ✅ Multiple orders from multiple users
- ✅ API rate limiting
- ✅ Request timeout handling
- ✅ Memory leak prevention

### Security
- ✅ API key validation
- ✅ JWT token validation
- ✅ HTTPS URL enforcement for webhooks
- ✅ No exposed internal system details in errors
- ✅ SQL injection prevention (via Prisma/ORM)
- ✅ XSS protection (JSON serialization)

## Running Integration Tests (Full Stack)

For complete integration testing with both services:

1. **Start P2-Back Gateway**
   ```bash
   cd P2-Back
   npm run start:gateway
   ```

2. **Start Ecommerce API** (in another terminal)
   ```bash
   cd ecommerce
   npm run dev
   ```

3. **Run Integration Tests** (in another terminal)
   ```bash
   cd ecommerce
   npm run test:e2e -- ecommerce-integration-complete-flow.e2e-spec.ts
   ```

## Debugging Tests

### Run with logging
```bash
VERBOSE=true npm run test:e2e
```

### Run single test
```bash
npm test -- ecommerce-payment.e2e-spec.ts -t "should register new user"
```

### Debug a test
```bash
node --inspect-brk ./node_modules/.bin/jest --runInBand
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies (Ecommerce)
        run: cd ecommerce && npm ci

      - name: Install dependencies (P2-Back)
        run: cd P2-Back && npm ci

      - name: Run Ecommerce E2E Tests
        run: cd ecommerce && npm run test:e2e

      - name: Run P2-Back E2E Tests
        run: cd P2-Back && npm run test:e2e
```

## Troubleshooting

### Port Conflicts
If tests fail with port already in use:
```bash
# Kill existing services
lsof -ti:3001,3002 | xargs kill -9
```

### Database Lock
If SQLite database is locked:
```bash
# Remove test database
rm ecommerce/prisma/test.db
npm run prisma:migrate
```

### Module Resolution Errors
For `@app/common` not found in P2-Back:
```bash
# Update jest.config.js moduleNameMapper
"^@app/common(.*)$": "<rootDir>/libs/common/src/$1"
```

### Timeout Errors
Increase timeout in jest config:
```js
testTimeout: 90000 // 90 seconds
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on state from previous tests
2. **Cleanup**: Use `afterEach` or `afterAll` to clean up test data
3. **Mocking**: Mock external services when testing in isolation
4. **Naming**: Use descriptive test names that explain what is being tested
5. **Assertions**: Use specific assertions rather than general truthy/falsy checks
6. **Coverage**: Aim for >80% code coverage for critical paths
7. **Documentation**: Add comments explaining complex test scenarios

## Contributing

When adding new tests:

1. Create test file in `src/__tests__/` directory
2. Follow naming convention: `*.e2e-spec.ts`
3. Use descriptive `describe` and `it` blocks
4. Add JSDoc comments for complex test setup
5. Ensure tests pass locally before pushing
6. Update this README with new test scenarios covered

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing/unit-testing)
- [Express Testing Best Practices](https://expressjs.com/en/guide/testing.html)
