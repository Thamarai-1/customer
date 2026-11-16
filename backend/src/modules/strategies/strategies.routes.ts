import { Router } from 'express';
import { StrategiesController } from './strategies.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  segmentParamSchema,
  customerStrategyParamSchema,
  updateStrategyConfigSchema
} from './strategies.schema.js';

const router = Router();

router.use(authenticateUser);

router.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  StrategiesController.list
);

router.get(
  '/:segmentName',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(segmentParamSchema),
  StrategiesController.getBySegment
);

router.put(
  '/:segmentName',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateStrategyConfigSchema),
  StrategiesController.update
);

router.get(
  '/customer/:customerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerStrategyParamSchema),
  StrategiesController.evaluateCustomer
);

export default router;
