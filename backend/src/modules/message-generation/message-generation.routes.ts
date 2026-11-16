import { Router } from 'express';
import { MessageGenerationController } from './message-generation.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  generateMessageRequestSchema,
  regenerateMessageRequestSchema,
  customerMessageParamSchema,
  messageIdParamSchema,
  updateMessageGenerationConfigSchema
} from './message-generation.schema.js';

const router = Router();

router.use(authenticateUser);

// Specific config routes first
router.get(
  '/config',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  MessageGenerationController.getConfig
);

router.put(
  '/config',
  authorizeRoles(UserRole.ADMIN),
  validateRequest(updateMessageGenerationConfigSchema),
  MessageGenerationController.updateConfig
);

// Customer-scoped routes
router.post(
  '/customers/:customerId/generate',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(generateMessageRequestSchema),
  MessageGenerationController.generate
);

router.get(
  '/customers/:customerId/context',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerMessageParamSchema),
  MessageGenerationController.previewContext
);

router.get(
  '/customers/:customerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerMessageParamSchema),
  MessageGenerationController.listByCustomer
);

// Message-scoped routes (parameterized)
router.post(
  '/:messageId/regenerate',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(regenerateMessageRequestSchema),
  MessageGenerationController.regenerate
);

router.get(
  '/:messageId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(messageIdParamSchema),
  MessageGenerationController.getById
);

export default router;
