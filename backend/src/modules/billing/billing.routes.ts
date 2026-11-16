import { Router } from 'express';
import { BillingController } from './billing.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { UserRole } from '../users/user.model.js';

const router = Router();

router.use(authenticateUser);

router.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  BillingController.listAll
);

export default router;
