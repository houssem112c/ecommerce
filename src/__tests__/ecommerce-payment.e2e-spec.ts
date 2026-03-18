import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import app from '../server';

const BASE_URL = 'https://p2-back-t8hx.onrender.com';
const API_KEY = process.env.TEST_API_KEY || 'test-api-key-12345';

interface TestUser {
  id?: string;
  email: string;
  password: string;
  token?: string;
}

interface TestCart {
  userId: string;
  items: Array<{ productId: string; quantity: number }>;
}

describe('Ecommerce Payment Integration E2E Tests', () => {
  let testUser: TestUser;
  let testCart: TestCart;
  let orderId: string;
  let paymentId: string;
  let authToken: string;

  beforeAll(async () => {
    // Wait for services to be ready
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });

  afterAll(async () => {
    // Cleanup - optional: delete test user and related data
    if (authToken && testUser.email) {
      try {
        await request(app).delete(`/api/users/${testUser.id}`).set('Authorization', `Bearer ${authToken}`);
      } catch (error) {
        console.log('Cleanup error (non-critical):', error);
      }
    }
  });

  describe('User Authentication Flow', () => {
    it('should register a new user', async () => {
      testUser = {
        email: `test-user-${Date.now()}@example.com`,
        password: 'TestPassword123!',
      };

      const response = await request(app).post('/api/auth/register').send({
        email: testUser.email,
        password: testUser.password,
        name: 'Test User',
      });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUser.email);

      testUser.id = response.body.user.id;
      authToken = response.body.token;
    });

    it('should login existing user', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe(testUser.email);

      authToken = response.body.token;
    });

    it('should reject invalid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject missing email field', async () => {
      const response = await request(app).post('/api/auth/login').send({
        password: testUser.password,
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Product and Cart Operations', () => {
    it('should fetch available products', async () => {
      const response = await request(app).get('/api/products').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('should add product to cart', async () => {
      const productsResponse = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);

      const productId = productsResponse.body[0]?.id;
      expect(productId).toBeDefined();

      const response = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          productId,
          quantity: 2,
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('items');

      testCart = {
        userId: testUser.id,
        items: [{ productId, quantity: 2 }],
      };
    });

    it('should retrieve cart contents', async () => {
      const response = await request(app).get('/api/cart').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should reject cart operations without authentication', async () => {
      const response = await request(app).get('/api/cart');

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should update cart item quantity', async () => {
      const cartResponse = await request(app).get('/api/cart').set('Authorization', `Bearer ${authToken}`);

      const cartItemId = cartResponse.body.items[0]?.id;
      expect(cartItemId).toBeDefined();

      const response = await request(app)
        .patch(`/api/cart/items/${cartItemId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ quantity: 3 });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body.quantity).toBe(3);
    });
  });

  describe('Order Creation from Cart', () => {
    it('should create order from cart with valid data', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TC',
            zipCode: '12345',
            country: 'Test Country',
          },
          billingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TC',
            zipCode: '12345',
            country: 'Test Country',
          },
          paymentMethod: 'card',
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('pending');

      orderId = response.body.id;
    });

    it('should fail to create order with empty cart', async () => {
      // Create new user with empty cart
      const newUserEmail = `empty-cart-user-${Date.now()}@example.com`;
      const registerResponse = await request(app).post('/api/auth/register').send({
        email: newUserEmail,
        password: 'TestPassword123!',
        name: 'Empty Cart User',
      });

      const emptyCartToken = registerResponse.body.token;

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${emptyCartToken}`)
        .send({
          shippingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TC',
            zipCode: '12345',
            country: 'Test Country',
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should fail to create order with missing shipping address', async () => {
      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          billingAddress: {
            street: '123 Test St',
            city: 'Test City',
            state: 'TC',
            zipCode: '12345',
            country: 'Test Country',
          },
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should retrieve created order', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(orderId);
      expect(response.body.userId).toBe(testUser.id);
    });

    it('should list user orders', async () => {
      const response = await request(app).get('/api/orders').set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.some((order: any) => order.id === orderId)).toBe(true);
    });
  });

  describe('Payment Initiation', () => {
    it('should initiate payment for order', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Key', API_KEY)
        .send({
          amount: 99.99,
          currency: 'USD',
          paymentMethod: 'card',
          cardToken: 'tok_visa_4242',
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('transactionId');
      expect(response.body.status).toMatch(/pending|processing|initiated/i);

      paymentId = response.body.transactionId;
    });

    it('should fail payment without API key', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 99.99,
          currency: 'USD',
          paymentMethod: 'card',
          cardToken: 'tok_visa_4242',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should fail payment with invalid API key', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Key', 'invalid-key-xxx')
        .send({
          amount: 99.99,
          currency: 'USD',
          paymentMethod: 'card',
          cardToken: 'tok_visa_4242',
        });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should fail payment with negative amount', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Key', API_KEY)
        .send({
          amount: -50.0,
          currency: 'USD',
          paymentMethod: 'card',
          cardToken: 'tok_visa_4242',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should fail payment with invalid currency', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Key', API_KEY)
        .send({
          amount: 99.99,
          currency: 'INVALID',
          paymentMethod: 'card',
          cardToken: 'tok_visa_4242',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Payment Status and Tracking', () => {
    it('should retrieve payment status', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}/payment/${paymentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('amount');
    });

    it('should list order payments', async () => {
      const response = await request(app)
        .get(`/api/orders/${orderId}/payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Webhook Handling', () => {
    it('should accept payment completion webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/payment-completed')
        .set('X-API-Key', API_KEY)
        .send({
          transactionId: paymentId,
          orderId: orderId,
          status: 'completed',
          amount: 99.99,
          currency: 'USD',
          timestamp: new Date().toISOString(),
          signature: 'webhook-signature-hash',
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.body).toHaveProperty('success');
    });

    it('should accept payment failed webhook', async () => {
      const response = await request(app)
        .post('/api/webhooks/payment-failed')
        .set('X-API-Key', API_KEY)
        .send({
          transactionId: 'failed-tx-12345',
          orderId: orderId,
          status: 'failed',
          errorCode: 'insufficient_funds',
          errorMessage: 'Card declined',
          timestamp: new Date().toISOString(),
          signature: 'webhook-signature-hash',
        });

      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it('should reject webhook without API key', async () => {
      const response = await request(app).post('/api/webhooks/payment-completed').send({
        transactionId: paymentId,
        orderId: orderId,
        status: 'completed',
      });

      expect(response.status).toBeGreaterThanOrEqual(401);
    });

    it('should reject webhook with invalid signature', async () => {
      const response = await request(app)
        .post('/api/webhooks/payment-completed')
        .set('X-API-Key', API_KEY)
        .send({
          transactionId: paymentId,
          orderId: orderId,
          status: 'completed',
          amount: 99.99,
          signature: 'invalid-signature-hash',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle concurrent payment attempts gracefully', async () => {
      const paymentRequests = Array.from({ length: 3 }, () =>
        request(app)
          .post(`/api/orders/${orderId}/payment`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-API-Key', API_KEY)
          .send({
            amount: 99.99,
            currency: 'USD',
            paymentMethod: 'card',
            cardToken: 'tok_visa_4242',
          })
      );

      const responses = await Promise.all(paymentRequests);

      // At most one should succeed, others should fail with conflict/duplicate
      const successCount = responses.filter((r) => r.status < 300).length;
      expect(successCount).toBeLessThanOrEqual(1);
    });

    it('should handle malformed JSON in request', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Key', API_KEY)
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle timeout gracefully', async () => {
      const response = await request(app)
        .post(`/api/orders/${orderId}/payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-API-Key', API_KEY)
        .timeout(5000)
        .send({
          amount: 99.99,
          currency: 'USD',
          paymentMethod: 'card',
          cardToken: 'tok_visa_4242',
        });

      expect(response.status).not.toBeUndefined();
    });

    it('should handle invalid order ID', async () => {
      const response = await request(app)
        .get('/api/orders/invalid-order-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBeGreaterThanOrEqual(404);
    });
  });
});
