import { Router } from 'express';
import { CustomerController } from './customer.controller.js';
import { ActivityController } from '../activities/activity.controller.js';
import { BillingController } from '../billing/billing.controller.js';
import { PreferenceController } from '../communications/preference.controller.js';
import { ImportController } from '../imports/import.controller.js';

import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { uploadMiddleware } from '../../middleware/upload.middleware.js';
import { UserRole } from '../users/user.model.js';

import {
  createCustomerSchema,
  updateCustomerSchema,
  updateStatusSchema,
  queryCustomerSchema
} from './customer.validation.js';
import { createActivitySchema, queryActivitySchema } from '../activities/activity.validation.js';
import { createBillingSchema } from '../billing/billing.validation.js';
import { updatePreferenceSchema } from '../communications/preference.validation.js';

const router = Router();

// Protect all customer routes with authentication
router.use(authenticateUser);

// -----------------------------------------------------------------------------
// Import Route (Must precede /:id)
// -----------------------------------------------------------------------------
router.post(
  '/import',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  uploadMiddleware.single('file'),
  ImportController.importCustomers
);

// -----------------------------------------------------------------------------
// Customer Collection CRUD
// -----------------------------------------------------------------------------
router.post(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(createCustomerSchema),
  CustomerController.create
);

router.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(queryCustomerSchema),
  CustomerController.list
);

router.get(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  CustomerController.getById
);

router.put(
  '/:id',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateCustomerSchema),
  CustomerController.update
);

router.patch(
  '/:id/status',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateStatusSchema),
  CustomerController.updateStatus
);

router.delete(
  '/:id',
  authorizeRoles(UserRole.ADMIN),
  CustomerController.delete
);

// -----------------------------------------------------------------------------
// Task 7: Consolidated Customer Profile Assembly
// -----------------------------------------------------------------------------
router.get(
  '/:id/profile',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  CustomerController.getProfile
);

// -----------------------------------------------------------------------------
// Task 4: Customer Activities
// -----------------------------------------------------------------------------
router.post(
  '/:id/activities',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(createActivitySchema),
  ActivityController.create
);

router.get(
  '/:id/activities',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(queryActivitySchema),
  ActivityController.list
);

router.get(
  '/:id/activity-summary',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  ActivityController.getSummary
);

// -----------------------------------------------------------------------------
// Task 5: Customer Billing
// -----------------------------------------------------------------------------
router.post(
  '/:id/billing',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(createBillingSchema),
  BillingController.createForCustomer
);

router.get(
  '/:id/billing',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  BillingController.listForCustomer
);

router.get(
  '/:id/billing-summary',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  BillingController.getSummaryForCustomer
);

// -----------------------------------------------------------------------------
// Task 6: Customer Communication Preferences
// -----------------------------------------------------------------------------
router.get(
  '/:id/preferences',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  PreferenceController.getForCustomer
);

router.put(
  '/:id/preferences',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updatePreferenceSchema),
  PreferenceController.updateForCustomer
);

export default router;
