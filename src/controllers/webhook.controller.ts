import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const handlePaymentWebhook = async (req: Request, res: Response) => {
  try {
    console.log('📨 Received payment webhook:', JSON.stringify(req.body, null, 2));

    const { transactionId, userId, status, amount, currency, valid, rejectionReason } = req.body;

    if (!transactionId) {
      console.error('❌ No transaction ID in webhook payload');
      return res.status(400).json({ message: 'Transaction ID required' });
    }

    // Find order by payment transaction ID
    const order = await prisma.order.findFirst({
      where: { paymentTransactionId: transactionId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      console.error('❌ Order not found for transaction:', transactionId);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('✅ Found order:', order.id, 'Status:', status, 'Valid:', valid);

    // Check if payment is valid (confirmed)
    if (status === 'CONFIRMED' && valid === true) {
      // Payment confirmed - update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
      });

      // Reduce stock for each product
      for (const item of order.items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      console.log('✅ Order marked as PAID:', order.id);

      return res.json({
        success: true,
        message: 'Payment confirmed, order updated',
      });
    } else if (status === 'REFUSED' || valid === false) {
      // Payment refused - update order status
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          notes: `Payment refused: ${rejectionReason || 'Unknown reason'}`,
        },
      });

      console.log('❌ Order cancelled due to payment refusal:', order.id);

      return res.json({
        success: true,
        message: 'Payment refused, order cancelled',
      });
    }

    // For PENDING or unknown status, just acknowledge
    console.log('ℹ️ Webhook received with status:', status);
    res.json({ 
      success: true, 
      message: 'Webhook received' 
    });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
