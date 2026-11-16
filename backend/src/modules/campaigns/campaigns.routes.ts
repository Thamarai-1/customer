import { Router } from 'express';
import { CampaignsController } from './campaigns.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from '../users/user.model.js';
import {
  createCampaignSchema,
  updateCampaignSchema,
  updateCampaignStatusSchema,
  campaignIdParamSchema,
  attachOfferSchema,
  detachOfferSchema,
  queryCampaignsSchema
} from './campaigns.schema.js';

const router = Router();

router.use(authenticateUser);

router.post(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(createCampaignSchema),
  CampaignsController.create
);

router.get(
  '/',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(queryCampaignsSchema),
  CampaignsController.list
);

router.get(
  '/:campaignId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER, UserRole.COMPLIANCE_REVIEWER),
  validateRequest(campaignIdParamSchema),
  CampaignsController.getById
);

router.put(
  '/:campaignId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateCampaignSchema),
  CampaignsController.update
);

router.patch(
  '/:campaignId/status',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(updateCampaignStatusSchema),
  CampaignsController.updateStatus
);

router.post(
  '/:campaignId/offers',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(attachOfferSchema),
  CampaignsController.attachOffer
);

router.delete(
  '/:campaignId/offers/:offerId',
  authorizeRoles(UserRole.ADMIN, UserRole.MARKETING_MANAGER),
  validateRequest(detachOfferSchema),
  CampaignsController.detachOffer
);

export default router;
