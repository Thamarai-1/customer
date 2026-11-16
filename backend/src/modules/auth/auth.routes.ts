import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { loginRateLimiter } from '../../middleware/rate-limit.middleware.js';
import { loginSchema, refreshSchema, changePasswordSchema } from './auth.validation.js';

const router = Router();

router.post('/login', loginRateLimiter, validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshSchema), AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', authenticateUser, AuthController.me);
router.post(
  '/change-password',
  authenticateUser,
  validateRequest(changePasswordSchema),
  AuthController.changePassword
);

export default router;
