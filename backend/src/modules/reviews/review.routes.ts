import { Router } from 'express';
import { ReviewController } from './review.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizePermissions } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import {
  reviewIdParamSchema,
  editMessageSchema,
  regenerateReviewSchema,
  approveReviewSchema,
  rejectReviewSchema,
  requestRevisionSchema,
  assignReviewerSchema
} from './review.schema.js';

const router = Router();

router.use(authenticateUser);

// 1. Dashboard statistics (Declared BEFORE /:reviewId)
router.get(
  '/dashboard/stats',
  authorizePermissions('reviews:read'),
  ReviewController.getDashboardStats
);

// 2. Review queue list
router.get(
  '/',
  authorizePermissions('reviews:read'),
  ReviewController.list
);

// 3. Review details workspace
router.get(
  '/:reviewId',
  authorizePermissions('reviews:read'),
  validateRequest(reviewIdParamSchema),
  ReviewController.getDetails
);

// 4. Start reviewing (claims / moves to UNDER_REVIEW)
router.post(
  '/:reviewId/start',
  authorizePermissions('reviews:read'),
  validateRequest(reviewIdParamSchema),
  ReviewController.start
);

// 5. Edit message content (creates new version, triggers compliance revalidation)
router.post(
  '/:reviewId/edit',
  authorizePermissions('reviews:edit'),
  validateRequest(editMessageSchema),
  ReviewController.edit
);

// 6. Regenerate message using AI provider (creates new version, triggers revalidation)
router.post(
  '/:reviewId/regenerate',
  authorizePermissions('reviews:edit'),
  validateRequest(regenerateReviewSchema),
  ReviewController.regenerate
);

// 7. Trigger compliance validation on current message draft
router.post(
  '/:reviewId/validate',
  authorizePermissions('reviews:edit'),
  validateRequest(reviewIdParamSchema),
  ReviewController.validate
);

// 8. Approve review (stale data checks, compliance verification, sets APPROVED)
router.post(
  '/:reviewId/approve',
  authorizePermissions('reviews:approve'),
  validateRequest(approveReviewSchema),
  ReviewController.approve
);

// 9. Reject review (records rejection code and reason)
router.post(
  '/:reviewId/reject',
  authorizePermissions('reviews:reject'),
  validateRequest(rejectReviewSchema),
  ReviewController.reject
);

// 10. Request revision (sends back for revision with instructions)
router.post(
  '/:reviewId/request-revision',
  authorizePermissions('reviews:edit'),
  validateRequest(requestRevisionSchema),
  ReviewController.requestRevision
);

// 11. Assign reviewer
router.patch(
  '/:reviewId/assign',
  authorizePermissions('reviews:assign'),
  validateRequest(assignReviewerSchema),
  ReviewController.assign
);

// 12. Version history
router.get(
  '/:reviewId/versions',
  authorizePermissions('reviews:read'),
  validateRequest(reviewIdParamSchema),
  ReviewController.getVersions
);

// 13. Audit action history
router.get(
  '/:reviewId/history',
  authorizePermissions('reviews:read'),
  validateRequest(reviewIdParamSchema),
  ReviewController.getHistory
);

export default router;
