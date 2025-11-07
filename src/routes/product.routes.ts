import { Router } from 'express';
import {
    getAllProducts,
    getProductById,
    searchProducts,
} from '../controllers/product.controller';

const router = Router();

router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/:id', getProductById);

export default router;
