import { Router } from 'express';
import { BillingPoliciesController } from './billing-policies.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  customerBillingParamSchema,
  updateBillingPolicySchema
} from './billing-policies.schema.js';

const router = Router();

router.use(authenticateUser);

router.get(
  '/config',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  BillingPoliciesController.getConfig
);

router.put(
  '/config',
  authorizeRoles(UserRole.ADMIN),
  validateRequest(updateBillingPolicySchema),
  BillingPoliciesController.updateConfig
);

router.get(
  '/customers/:customerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerBillingParamSchema),
  BillingPoliciesController.evaluateCustomer
);

router.post(
  '/customers/:customerId/evaluate',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerBillingParamSchema),
  BillingPoliciesController.evaluateCustomer
);

export default router;
