import { Router } from 'express';
import { PolicyEngineController } from './policy-engine.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import { customerPolicyParamSchema } from './policy-engine.schema.js';

const router = Router();

router.use(authenticateUser);

router.post(
  '/customers/:customerId/evaluate',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerPolicyParamSchema),
  PolicyEngineController.evaluate
);

router.get(
  '/customers/:customerId/latest',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerPolicyParamSchema),
  PolicyEngineController.getLatest
);

export default router;
