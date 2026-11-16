import { Router } from 'express';
import { ComplianceController } from './compliance.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  messageIdParamSchema,
  reportIdParamSchema,
  customerIdParamSchema,
  updateCompliancePolicyConfigSchema
} from './compliance.schema.js';

const router = Router();

router.use(authenticateUser);

// 1. Static/Config/Analytics routes (Declared FIRST to avoid collision with :messageId)
router.get(
  '/config',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  ComplianceController.getConfig
);

router.put(
  '/config',
  authorizeRoles(UserRole.ADMIN, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(updateCompliancePolicyConfigSchema),
  ComplianceController.updateConfig
);

router.get(
  '/statistics',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  ComplianceController.getStatistics
);

router.get(
  '/blocked-messages',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  ComplianceController.getBlockedMessages
);

// 2. Report-scoped routes
router.get(
  '/reports/:reportId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(reportIdParamSchema),
  ComplianceController.getById
);

// 3. Customer-scoped routes
router.post(
  '/customers/:customerId/validate-drafts',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(customerIdParamSchema),
  ComplianceController.validateCustomerDrafts
);

// 4. Message-scoped routes
router.post(
  '/messages/:messageId/validate',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(messageIdParamSchema),
  ComplianceController.validate
);

router.get(
  '/messages/:messageId/latest',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(messageIdParamSchema),
  ComplianceController.getLatest
);

router.get(
  '/messages/:messageId/history',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(messageIdParamSchema),
  ComplianceController.getHistory
);

export default router;
