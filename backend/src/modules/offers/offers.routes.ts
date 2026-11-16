import { Router } from 'express';
import { OffersController } from './offers.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  createOfferSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  offerIdParamSchema,
  evaluateOfferParamSchema,
  queryOffersSchema
} from './offers.schema.js';

const router = Router();

router.use(authenticateUser);

router.post(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(createOfferSchema),
  OffersController.create
);

router.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(queryOffersSchema),
  OffersController.list
);

router.get(
  '/:offerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(offerIdParamSchema),
  OffersController.getById
);

router.put(
  '/:offerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateOfferSchema),
  OffersController.update
);

router.patch(
  '/:offerId/status',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateOfferStatusSchema),
  OffersController.updateStatus
);

router.post(
  '/:offerId/evaluate/:customerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(evaluateOfferParamSchema),
  OffersController.evaluateCustomer
);

export default router;
