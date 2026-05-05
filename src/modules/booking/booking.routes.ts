import { Router } from 'express';
import {
  createBookingHandler, getMyBookings, getAgentBookingsHandler,
  updateBookingHandler, adminBookingsHandler,
} from './booking.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createBookingSchema, updateBookingSchema } from './booking.schema';

const router = Router();

router.post('/', authenticate, authorize('BUYER'), validate(createBookingSchema), createBookingHandler);
router.get('/my', authenticate, getMyBookings);
router.get('/agent', authenticate, authorize('AGENT', 'ADMIN'), getAgentBookingsHandler);
router.get('/admin', authenticate, authorize('ADMIN'), adminBookingsHandler);
router.patch('/:id', authenticate, validate(updateBookingSchema), updateBookingHandler);

export default router;
