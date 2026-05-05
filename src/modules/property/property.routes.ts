import { Router } from 'express';
import {
  listProperties, getProperty, createPropertyHandler, updatePropertyHandler,
  deletePropertyHandler, removeImageHandler, featuredPropertiesHandler,
  agentPropertiesHandler, propertyStatsHandler,
} from './property.controller';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createPropertySchema, updatePropertySchema } from './property.schema';
import { upload } from '../../middlewares/upload.middleware';

const router = Router();

// Public
router.get('/', listProperties);
router.get('/featured', featuredPropertiesHandler);
router.get('/stats', authenticate, authorize('ADMIN'), propertyStatsHandler);
router.get('/my', authenticate, authorize('AGENT', 'ADMIN'), agentPropertiesHandler);
router.get('/:id', getProperty);

// Agent/Admin
router.post(
  '/',
  authenticate,
  authorize('AGENT', 'ADMIN'),
  upload.array('images', 10),
  validate(createPropertySchema),
  createPropertyHandler
);

router.patch(
  '/:id',
  authenticate,
  authorize('AGENT', 'ADMIN'),
  upload.array('images', 10),
  validate(updatePropertySchema),
  updatePropertyHandler
);

router.delete('/:id', authenticate, authorize('AGENT', 'ADMIN'), deletePropertyHandler);
router.delete('/:id/images', authenticate, authorize('AGENT', 'ADMIN'), removeImageHandler);

export default router;
