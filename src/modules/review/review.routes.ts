import { Router } from 'express';
import { createReviewHandler, getReviewsHandler, deleteReviewHandler } from './review.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createReviewSchema } from './review.schema';

const router = Router({ mergeParams: true });

router.get('/', getReviewsHandler);
router.post('/', authenticate, authorize('BUYER'), validate(createReviewSchema), createReviewHandler);
router.delete('/:id', authenticate, deleteReviewHandler);

export default router;
