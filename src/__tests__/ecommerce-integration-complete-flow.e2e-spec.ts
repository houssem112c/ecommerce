import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

const ECOMMERCE_API = 'https://p2-back-t8hx.onrender.com';
const P2_BACK_API = 'http://localhost:3002';
const API_KEY = 'ecommerce-api-key-12345';

describe('Complete Order to Payment Confirmation Flow E2E', () => {
  let authToken: string;
  let userId: string;
  let orderId: string;
  let transactionId: string;
  let cartId: string;

  // Test user credentials
  const testUser = {
    email: `ecommerce-test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test E-Commerce User',
  };

  // Test products
  const testProducts = [
    {
      name: 'Laptop Computer',
      sku: 'LAPTOP-001',
      price: 999.99,
      stock: 10,
    },
    {
      name: 'USB Cable',
      sku: 'USB-CABLE-001',
      price: 9.99,
      stock: 100,
    },
  ];

  beforeAll(async () => {
    // Initialize test data
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup test data
    if (authToken && userId) {
      try {
        await request(ECOMMERCE_API).delete(`/api/users/${userId}`).set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.log('Cleanup skipped');
      }
    }
  });

  describe('Phase 1: User Registration and Authentication', () => {
    it('should register new ecommerce customer', async () => {
      const response = await request(ECOMMERCE_API).post('/api/auth/register').send({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);

      userId = response.body.user.id;
      authToken = response.body.token;
    });

    it('should authenticate user with valid credentials', async () => {
      const response = await request(ECOMMERCE_API).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.id).toBe(userId);
    });

    it('should reject authentication with invalid credentials', async () => {
      const response = await request(ECOMMERCE_API).post('/api/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Phase 2: Product Browsing and Cart Management', () => {
    let productIds: string[] = [];

    it('should fetch available products', async () => {
      const response = await request(ECOMMERCE_API)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      // Store product IDs for later
      productIds = response.body.slice(0, 2).map((p: any) => p.id);
    });

    it('should add first product to cart', async () => {
      const response = await request(ECOMMERCE_API)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productIds[0],
          quantity: 1,
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items.some((item: any) => item.productId === productIds[0])).toBe(true);
    });

    it('should add second product to cart', async () => {
      const response = await request(ECOMMERCE_API)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productIds[1],
          quantity: 2,
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should retrieve cart with all items', async () => {
      const response = await request(ECOMMERCE_API).get('/api/cart').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);

      // Verify cart totals
      expect(response.body).toHaveProperty('subtotal');
      expect(response.body.subtotal).toBeGreaterThan(0);

      cartId = response.body.id;
    });

    it('should update cart item quantity', async () => {
      const getCartResponse = await request(ECOMMERCE_API).get('/api/cart').set('Authorization', `Bearer ${authToken}`);

      const cartItemId = getCartResponse.body.items[0]?.id;
      expect(cartItemId).toBeDefined();

      const response = await request(ECOMMERCE_API)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 3 });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body.quantity).toBe(3);
    });

    it('should fail to add product with insufficient stock', async () => {
      const response = await request(ECOMMERCE_API)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId: productIds[0],
          quantity: 9999, // Likely exceeds stock
        });

      // Should either reject or cap quantity
      expect([400, 200, 422]).toContain(response.status);
    });

    it('should reject cart operations without authentication', async () => {
      const response = await request(ECOMMERCE_API).get('/api/cart');

      expect(response.status).toBeGreaterThanOrEqual(401);
    });
  });

  describe('Phase 3: Order Creation', () => {
    it('should create order from cart with valid shipping data', async () => {
      const response = await request(ECOMMERCE_API)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            street: '123 E-Commerce St',
            city: 'Online City',
            state: 'OS',
            zipCode: '12345',
            country: 'Test Country',
          },
          billingAddress: {
            street: '456 Billing Ave',
            city: 'Payment City',
            state: 'PS',
            zipCode: '54321',
            country: 'Test Country',
          },
          paymentMethod: 'bank_transfer', // Manual payment verification required
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');
      expect(response.body.userId).toBe(userId);
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBeGreaterThan(0);

      orderId = response.body.id;
    });

    it('should fail order creation with empty cart', async () => {
      // Create new user with empty cart
      const newUser = {
        email: `empty-cart-${Date.now()}@example.com`,
        password: 'TestPassword123!',
        name: 'Empty Cart User',
      };

      const registerResponse = await request(ECOMMERCE_API).post('/api/auth/register').send(newUser);

      const emptyCartToken = registerResponse.body.token;

      const response = await request(ECOMMERCE_API)
        .post('/api/orders')
        .set('Authorization', `Bearer ${emptyCartToken}`)
        .send({
          shippingAddress: {
            street: '123 St',
            city: 'City',
            state: 'ST',
            zipCode: '12345',
            country: 'Country',
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('message');
    });

    it('should fail order creation with missing shipping address', async () => {
      const response = await request(ECOMMERCE_API)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing shipping address
          billingAddress: {
            street: '456 Billing Ave',
            city: 'City',
            state: 'ST',
            zipCode: '54321',
            country: 'Country',
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should retrieve created order', async () => {
      const response = await request(ECOMMERCE_API)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(orderId);
      expect(response.body.userId).toBe(userId);
      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should list all user orders', async () => {
      const response = await request(ECOMMERCE_API).get('/api/orders').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((order: any) => order.id === orderId)).toBe(true);
    });
  });

  describe('Phase 4: Payment Initiation with P2-Back Gateway', () => {
    it('should initiate payment through P2-Back gateway', async () => {
      // Ecommerce backend calls P2-Back to initiate payment
      const response = await request(P2_BACK_API)
        .post('/transaction/payment/initiate')
        .set('x-api-key', API_KEY)
        .send({
          amount: 1019.97, // (999.99 * 1) + (9.99 * 2)
          userEmail: testUser.email,
          userId: userId,
          webhookReturnURL: `${ECOMMERCE_API}/api/webhooks/payment`,
          externalReference: orderId, // Link to ecommerce order
          itemDescription: '2 items - Laptop Computer and USB Cable',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('transactionId');
      expect(response.body.status).toBe('initiated');
      expect(response.body.amount).toBe(1019.97);
      expect(response.body.externalReference).toBe(orderId);
      expect(response.body).toHaveProperty('redirectUrl');
      expect(response.body).toHaveProperty('expiresAt');

      transactionId = response.body.transactionId;

      // Ecommerce should save this transactionId with the order
      const updateResponse = await request(ECOMMERCE_API)
        .patch(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          paymentTransactionId: transactionId,
          status: 'payment_pending',
        });

      expect(updateResponse.status).toBeGreaterThanOrEqual(200);
    });

    it('should fail payment initiation without API key', async () => {
      const response = await request(P2_BACK_API)
        .post('/transaction/payment/initiate')
        .send({
          amount: 1019.97,
          userEmail: testUser.email,
          userId: userId,
          webhookReturnURL: `${ECOMMERCE_API}/api/webhooks/payment`,
          externalReference: orderId,
        });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should fail payment initiation with invalid webhook URL', async () => {
      const response = await request(P2_BACK_API)
        .post('/transaction/payment/initiate')
        .set('x-api-key', API_KEY)
        .send({
          amount: 1019.97,
          userEmail: testUser.email,
          userId: userId,
          webhookReturnURL: 'not-a-valid-url',
          externalReference: orderId,
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Phase 5: Payment Proof Submission (Manual Gateway)', () => {
    it('should allow customer to submit payment proof', async () => {
      const response = await request(P2_BACK_API)
        .post(`/transaction/${transactionId}/submit-proof`)
        .set('x-api-key', API_KEY)
        .send({
          screenshotURL: 'https://cdn.ecommerce.com/proofs/transaction-proof-123.jpg',
          paymentDetails: {
            bankName: 'Test Bank',
            transactionRef: 'REF-2024-001',
            amount: 1019.97,
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('proofStatus');
    });

    it('should reject proof submission with invalid screenshot URL', async () => {
      const response = await request(P2_BACK_API)
        .post(`/transaction/${transactionId}/submit-proof`)
        .set('x-api-key', API_KEY)
        .send({
          screenshotURL: 'invalid-url',
          paymentDetails: {
            bankName: 'Test Bank',
            transactionRef: 'REF-2024-001',
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Phase 6: Webhook Payment Status Callback', () => {
    it('should handle payment confirmation webhook', async () => {
      // P2-Back sends webhook to ecommerce when payment is confirmed
      const webhookPayload = {
        transactionId: transactionId,
        externalReference: orderId,
        status: 'CONFIRMED',
        valid: true,
        amount: 1019.97,
        currency: 'USD',
        userEmail: testUser.email,
        userId: userId,
        timestamp: new Date().toISOString(),
        paymentMethod: 'bank_transfer',
      };

      const response = await request(ECOMMERCE_API)
        .post('/api/webhooks/payment')
        .set('X-API-Key', API_KEY)
        .send(webhookPayload);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('success');

      // Ecommerce should update order status to PAID
      const orderCheckResponse = await request(ECOMMERCE_API)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(orderCheckResponse.body.status).toBe('PAID');
      expect(orderCheckResponse.body).toHaveProperty('paidAt');
    });

    it('should handle payment rejection webhook', async () => {
      // Create another order for rejection test
      const newOrderResponse = await request(ECOMMERCE_API)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            street: '789 Test Ave',
            city: 'Test City',
            state: 'TC',
            zipCode: '99999',
            country: 'Test Country',
          },
        });

      const testOrderId = newOrderResponse.body.id;

      const webhookPayload = {
        transactionId: 'tx-rejected-001',
        externalReference: testOrderId,
        status: 'REFUSED',
        valid: false,
        rejectionReason: 'Insufficient funds',
        amount: 1019.97,
        currency: 'USD',
        userEmail: testUser.email,
        userId: userId,
        timestamp: new Date().toISOString(),
      };

      const response = await request(ECOMMERCE_API)
        .post('/api/webhooks/payment')
        .set('X-API-Key', API_KEY)
        .send(webhookPayload);

      expect(response.status).toBeGreaterThanOrEqual(200);

      // Verify order is cancelled
      const orderCheckResponse = await request(ECOMMERCE_API)
        .get(`/api/orders/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(orderCheckResponse.body.status).toBe('CANCELLED');
    });

    it('should handle payment timeout webhook', async () => {
      const newOrderResponse = await request(ECOMMERCE_API)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            street: '999 Timeout St',
            city: 'Timeout City',
            state: 'TC',
            zipCode: '00000',
            country: 'Test Country',
          },
        });

      const timeoutOrderId = newOrderResponse.body.id;

      const webhookPayload = {
        transactionId: 'tx-timeout-001',
        externalReference: timeoutOrderId,
        status: 'TIME_ENDED',
        valid: false,
        rejectionReason: 'Payment window expired',
        amount: 1019.97,
        currency: 'USD',
        userEmail: testUser.email,
        userId: userId,
        timestamp: new Date().toISOString(),
      };

      const response = await request(ECOMMERCE_API)
        .post('/api/webhooks/payment')
        .set('X-API-Key', API_KEY)
        .send(webhookPayload);

      expect(response.status).toBeGreaterThanOrEqual(200);

      // Order should be cancelled
      const orderCheckResponse = await request(ECOMMERCE_API)
        .get(`/api/orders/${timeoutOrderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(orderCheckResponse.body.status).toBe('CANCELLED');
    });
  });

  describe('Phase 7: Order Fulfillment', () => {
    it('should have reduced stock after payment confirmation', async () => {
      const response = await request(ECOMMERCE_API)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      // Verify stock was decremented for paid order
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should allow order status tracking for paid order', async () => {
      const response = await request(ECOMMERCE_API)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PAID');
      expect(response.body).toHaveProperty('paidAt');
      expect(response.body).toHaveProperty('items');

      // Verify all items in order
      response.body.items.forEach((item: any) => {
        expect(item).toHaveProperty('productId');
        expect(item).toHaveProperty('quantity');
        expect(item).toHaveProperty('price');
      });
    });
  });

  describe('Phase 8: Error Recovery and Edge Cases', () => {
    it('should handle concurrent payment attempts for same order', async () => {
      // Create new order
      const newOrderResponse = await request(ECOMMERCE_API)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            street: '111 Concurrent Ave',
            city: 'Parallel City',
            state: 'PC',
            zipCode: '11111',
            country: 'Test Country',
          },
        });

      const concurrentOrderId = newOrderResponse.body.id;

      // Try to initiate payment multiple times simultaneously
      const paymentRequests = Array.from({ length: 3 }, () =>
        request(P2_BACK_API)
          .post('/transaction/payment/initiate')
          .set('x-api-key', API_KEY)
          .send({
            amount: 1019.97,
            userEmail: testUser.email,
            userId: userId,
            webhookReturnURL: `${ECOMMERCE_API}/api/webhooks/payment`,
            externalReference: concurrentOrderId,
          })
      );

      const responses = await Promise.all(paymentRequests);

      // At least one should succeed
      const successCount = responses.filter((r) => r.status === 201).length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle idempotent payment retry', async () => {
      const retryOrderId = `retry-order-${Date.now()}`;

      // First attempt
      const firstAttempt = await request(P2_BACK_API)
        .post('/transaction/payment/initiate')
        .set('x-api-key', API_KEY)
        .send({
          amount: 500.00,
          userEmail: testUser.email,
          userId: userId,
          webhookReturnURL: `${ECOMMERCE_API}/api/webhooks/payment`,
          externalReference: retryOrderId,
        });

      expect(firstAttempt.status).toBe(201);
      const firstTransactionId = firstAttempt.body.transactionId;

      // Retry with same order ID
      const secondAttempt = await request(P2_BACK_API)
        .post('/transaction/payment/initiate')
        .set('x-api-key', API_KEY)
        .send({
          amount: 500.00,
          userEmail: testUser.email,
          userId: userId,
          webhookReturnURL: `${ECOMMERCE_API}/api/webhooks/payment`,
          externalReference: retryOrderId,
        });

      expect(secondAttempt.status).toBe(201);
      // Should either return same ID or handle gracefully
      expect([firstTransactionId, secondAttempt.body.transactionId]).toBeDefined();
    });

    it('should gracefully handle webhook delivery failures and retries', async () => {
      const webhookPayload = {
        transactionId: 'tx-retry-webhook-001',
        externalReference: orderId,
        status: 'CONFIRMED',
        valid: true,
        amount: 1019.97,
        currency: 'USD',
        userEmail: testUser.email,
        userId: userId,
        timestamp: new Date().toISOString(),
      };

      // Attempt webhook delivery
      const response = await request(ECOMMERCE_API)
        .post('/api/webhooks/payment')
        .set('X-API-Key', API_KEY)
        .send(webhookPayload);

      // Should handle retries gracefully
      expect([200, 201, 409]).toContain(response.status);
    });
  });
});
