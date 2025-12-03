import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

// Create order from cart
export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { shippingAddress, shippingCity, shippingCountry, shippingZipCode, notes } = req.body;

    console.log('📦 Create order request:', {
      userId,
      shippingAddress,
      shippingCity,
      shippingCountry,
      shippingZipCode,
    });

    // Extra debug: print all carts for all users
    const allCarts = await prisma.cart.findMany({
      include: { items: true },
    });
    console.log('🗂️ All carts in DB:', allCarts.map(c => ({ userId: c.userId, cartId: c.id, items: c.items.length })));

    if (!shippingAddress || !shippingCity || !shippingCountry || !shippingZipCode) {
      console.error('❌ Missing shipping info');
      return res.status(400).json({ message: 'Shipping information required' });
    }

    // Get cart with items for this user
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('🛒 Cart for userId', userId, ':', JSON.stringify(cart, null, 2));
    console.log('🛒 Cart items count:', cart?.items?.length || 0);

    if (!cart || cart.items.length === 0) {
      console.error('❌ Cart is empty for userId', userId);
      return res.status(400).json({ 
        message: 'Your cart is empty. Please add products to your cart before checking out.' 
      });
    }

    // Validate stock for all items
    for (const item of cart.items) {
      console.log(`📊 Checking stock for ${item.product.name}: ${item.product.stock} available, ${item.quantity} requested`);
      if (item.product.stock < item.quantity) {
        console.error(`❌ Insufficient stock for ${item.product.name}`);
        return res.status(400).json({
          message: `Insufficient stock for ${item.product.name}`,
        });
      }
    }

    // Calculate total
    const totalAmount = Math.round(cart.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    ) * 100) / 100;

    console.log('💰 Total amount:', totalAmount);
    console.log('📝 Creating order...');

    // Create order with items
    const order = await prisma.order.create({
      data: {
        userId,
        totalAmount,
        shippingAddress,
        shippingCity,
        shippingCountry,
        shippingZipCode,
        notes,
        status: 'PENDING',
        items: {
          create: cart.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.product.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    console.log('✅ Order created:', order.id);

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    console.log('🧹 Cart cleared');

    res.status(201).json({
      message: 'Order created successfully',
      order,
    });
  } catch (error: any) {
    console.error('❌ Create order error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
};

// Initiate payment for order
export const initiatePayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { orderId } = req.params;
    // No payment method will be provided by the checkout page. We delegate method/agent selection to the payment frontend.
    console.log('💳 Initiate payment request (no payment type from checkout):', { orderId, userId });

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      console.error('❌ Order not found:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== userId) {
      console.error('❌ Unauthorized access to order:', { orderId, userId, orderUserId: order.userId });
      return res.status(403).json({ message: 'Unauthorized' });
    }

    if (order.status !== 'PENDING') {
      console.error('❌ Order status is not PENDING:', order.status);
      return res.status(400).json({ message: 'Order payment already initiated or completed' });
    }

    // Call Payment System API
    const paymentApiUrl = process.env.PAYMENT_API_URL!;
    const paymentApiKey = process.env.PAYMENT_API_KEY!;
    const webhookUrl = process.env.PAYMENT_WEBHOOK_URL!;

    const paymentPayload = {
      amount: order.totalAmount,
      // intentionally omitting any payment method type — payment portal / backend will choose an agent/method
      userEmail: order.user.email,
      userId: order.userId,
      webhookReturnURL: webhookUrl,
    };

    console.log('📤 Sending payment request to:', paymentApiUrl);
    console.log('📦 Payment payload:', paymentPayload);
    console.log('🔑 API Key:', paymentApiKey ? 'Present' : 'Missing');

    const paymentResponse = await fetch(paymentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': paymentApiKey,
      },
      body: JSON.stringify(paymentPayload),
    });

    const paymentData: any = await paymentResponse.json();

    console.log('📥 Payment API response:', paymentData);

    // Check if payment was successful by looking for transaction ID
    if (!paymentData.id || paymentData.statusCode >= 400) {
      console.error('❌ Payment initiation failed:', paymentData);
      return res.status(paymentData.statusCode || 400).json({
        message: 'Payment initiation failed',
        error: paymentData.message || 'Unknown error',
      });
    }

    console.log('✅ Payment initiated, transaction ID:', paymentData.id);

    // Update order with payment transaction ID
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'PAYMENT_INITIATED',
        paymentTransactionId: paymentData.id,
      },
    });

    const frontendPaymentUrl = process.env.FRONTEND_PAYMENT_URL || 'https://tfinproject.pages.dev/';

    res.json({
      message: 'Payment initiated successfully',
      redirect_url: `${frontendPaymentUrl.replace(/\/$/, '')}/payment?transactionId=${paymentData.id}&orderId=${orderId}`,
      transaction_id: paymentData.id,
    });
  } catch (error) {
    console.error('Initiate payment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user orders
export const getOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get order by ID
export const getOrderById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
