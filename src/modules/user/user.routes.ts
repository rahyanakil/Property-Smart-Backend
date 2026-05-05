import { Router } from 'express';
import {
  getProfile, updateProfileHandler, changePasswordHandler, uploadAvatarHandler,
  getUsersHandler, updateRoleHandler, toggleStatusHandler,
  getFavoritesHandler, toggleFavoriteHandler,
} from './user.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { updateProfileSchema, changePasswordSchema, updateUserRoleSchema } from './user.schema';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Authenticated user routes
router.get('/profile', authenticate, getProfile);
router.patch('/profile', authenticate, validate(updateProfileSchema), updateProfileHandler);
router.patch('/password', authenticate, validate(changePasswordSchema), changePasswordHandler);
router.post('/avatar', authenticate, upload.single('avatar'), uploadAvatarHandler);
router.get('/favorites', authenticate, getFavoritesHandler);
router.post('/favorites/:propertyId', authenticate, toggleFavoriteHandler);

// Admin routes
router.get('/', authenticate, authorize('ADMIN'), getUsersHandler);
router.patch('/:id/role', authenticate, authorize('ADMIN'), validate(updateUserRoleSchema), updateRoleHandler);
router.patch('/:id/status', authenticate, authorize('ADMIN'), toggleStatusHandler);

export default router;
