import { Router } from 'express';
import {
    createOrder,
    getOrders,
    getOrderById,
    initiatePayment,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate); // All order routes require authentication

router.post('/create', createOrder);
router.post('/initiate-payment/:orderId', initiatePayment);
router.get('/', getOrders);
router.get('/:id', getOrderById);

export default router;
