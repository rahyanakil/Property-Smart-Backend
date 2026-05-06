import { Router } from 'express';
import { register, login, logout, refresh, getMe, oauthInitiate, oauthCallback } from './auth.controller';
import { authenticate } from '../../middlewares/auth.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { registerSchema, loginSchema } from './auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticate, logout);
router.post('/refresh', refresh);
router.get('/me', authenticate, getMe);
router.get('/oauth/:provider', oauthInitiate);
router.get('/oauth/:provider/callback', oauthCallback);

export default router;
