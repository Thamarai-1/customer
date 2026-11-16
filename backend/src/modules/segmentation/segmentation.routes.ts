import { Router } from 'express';
import { SegmentationController } from './segmentation.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  classifyCustomerSchema,
  getSegmentCustomersSchema,
  updateSegmentationConfigSchema
} from './segmentation.schema.js';

const router = Router();

// All segmentation routes require an authenticated session
router.use(authenticateUser);

/**
 * Segmentation Configuration Management
 */
router.get(
  '/config',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  SegmentationController.getConfig
);

router.put(
  '/config',
  authorizeRoles(UserRole.ADMIN),
  validateRequest(updateSegmentationConfigSchema),
  SegmentationController.updateConfig
);

/**
 * Global Statistics and Catalog Definitions
 */
router.get(
  '/statistics',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  SegmentationController.getStatistics
);

router.get(
  '/segments',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  SegmentationController.getSegmentDefinitions
);

/**
 * Batch Bulk Classification
 */
router.post(
  '/classify-all',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  SegmentationController.classifyAll
);

/**
 * Segment Customers Querying
 */
router.get(
  '/segments/:segmentName/customers',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(getSegmentCustomersSchema),
  SegmentationController.getCustomersBySegment
);

/**
 * Individual Customer Classification & History
 */
router.post(
  '/customers/:customerId/classify',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(classifyCustomerSchema),
  SegmentationController.classifyCustomer
);

router.get(
  '/customers/:customerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(classifyCustomerSchema),
  SegmentationController.getCustomerClassification
);

router.get(
  '/customers/:customerId/history',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(classifyCustomerSchema),
  SegmentationController.getCustomerClassificationHistory
);

export default router;
