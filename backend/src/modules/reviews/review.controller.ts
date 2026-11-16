import { Request, Response } from 'express';
import { ReviewService } from './review.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';
import { ReviewStatus } from './review.constants.js';

export class ReviewController {
  /**
   * GET /api/v1/reviews
   * List reviews with query filters & pagination.
   */
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const pagination = getPaginationParams(req.query);
      const status = req.query.status as ReviewStatus | undefined;
      const channel = req.query.channel as string | undefined;
      const segment = req.query.segment as string | undefined;
      const reviewerId = req.query.reviewerId as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await ReviewService.listReviews(
        pagination,
        {
          status,
          channel,
          segment,
          assignedReviewerId: reviewerId,
          search
        }
      );

      ResponseUtil.success(res, 'Reviews retrieved successfully', result.reviews, result.meta, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve reviews';
      ResponseUtil.error(res, message, 'REVIEW_LIST_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/reviews/dashboard/stats
   * Returns aggregate dashboard KPIs and workload metrics.
   */
  static async getDashboardStats(_req: Request, res: Response): Promise<void> {
    try {
      const stats = await ReviewService.getDashboardStats();
      ResponseUtil.success(res, 'Review dashboard statistics retrieved successfully', stats, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve review statistics';
      ResponseUtil.error(res, message, 'REVIEW_STATS_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/reviews/:reviewId
   * Retrieves complete review workspace details.
   */
  static async getDetails(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const details = await ReviewService.getReviewDetails(reviewId);
      ResponseUtil.success(res, 'Review details retrieved successfully', details, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve review details';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_DETAIL_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/start
   * Marks a review item as UNDER_REVIEW and assigns it to current user.
   */
  static async start(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const reviewerUser = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const updated = await ReviewService.startReview(reviewId, reviewerUser);
      ResponseUtil.success(res, 'Review started successfully', updated, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start review';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.startsWith('CANNOT_START_REVIEW')) {
        ResponseUtil.error(res, 'Cannot start review on an already finalized item', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_START_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/edit
   * Edits message draft, creates a new version, and triggers compliance revalidation.
   */
  static async edit(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const actor = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const result = await ReviewService.editMessage(reviewId, req.body, actor);
      ResponseUtil.success(res, 'Message edited and revalidated successfully', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to edit message';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.startsWith('CANNOT_EDIT')) {
        ResponseUtil.error(res, 'Cannot edit an approved, rejected, or cancelled message', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_EDIT_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/regenerate
   * Regenerates message using AI provider, versions the draft, and revalidates compliance.
   */
  static async regenerate(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const actor = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const result = await ReviewService.regenerateMessage(reviewId, req.body, actor);
      ResponseUtil.success(res, 'Message regenerated and revalidated successfully', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to regenerate message';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.startsWith('CANNOT_REGENERATE')) {
        ResponseUtil.error(res, 'Cannot regenerate an approved, rejected, or cancelled message', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_REGENERATE_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/validate
   * Triggers explicit compliance validation for current review version.
   */
  static async validate(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const actor = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const result = await ReviewService.validateReviewMessage(reviewId, actor);
      ResponseUtil.success(res, 'Compliance validation completed for review', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to validate message';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_VALIDATION_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/approve
   * Enforces all preconditions, executes stale-data re-verification, and atomically commits approval.
   */
  static async approve(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const reviewer = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const approved = await ReviewService.approveReview(reviewId, req.body, reviewer);
      ResponseUtil.success(res, 'Message successfully approved for delivery staging', approved, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to approve review';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.startsWith('VERSION_MISMATCH')) {
        ResponseUtil.error(
          res,
          'Submitted version does not match the current message draft version',
          'VERSION_CONFLICT',
          undefined,
          409
        );
        return;
      }
      if (message.startsWith('APPROVAL_PRECONDITION_FAILED') || message === 'INVALID_STATUS_FOR_APPROVAL') {
        ResponseUtil.error(
          res,
          'Review must be in PENDING_REVIEW or UNDER_REVIEW state to be approved',
          'PRECONDITION_FAILED',
          undefined,
          412
        );
        return;
      }
      if (message.startsWith('WARNINGS_ACKNOWLEDGEMENT_REQUIRED') || message === 'UNACKNOWLEDGED_COMPLIANCE_WARNINGS') {
        ResponseUtil.error(
          res,
          'Compliance warnings must be explicitly reviewed and acknowledged before approval',
          'WARNINGS_UNACKNOWLEDGED',
          undefined,
          400
        );
        return;
      }
      if (message.startsWith('COMPLIANCE_VERIFICATION_FAILED') || message.startsWith('APPROVAL_BLOCKED_COMPLIANCE:')) {
        ResponseUtil.error(
          res,
          message,
          'COMPLIANCE_REJECTED',
          undefined,
          422
        );
        return;
      }
      if (message.startsWith('APPROVAL_BLOCKED_STALE_DATA:') || message.startsWith('STALE_DATA_')) {
        ResponseUtil.error(
          res,
          message,
          'STALE_DATA_DETECTED',
          undefined,
          409
        );
        return;
      }
      if (message === 'CONCURRENT_UPDATE_CONFLICT') {
        ResponseUtil.error(
          res,
          'The review item was modified concurrently by another process. Please reload and retry.',
          'CONCURRENCY_CONFLICT',
          undefined,
          409
        );
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_APPROVE_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/reject
   * Rejects message with required rejection code and comments.
   */
  static async reject(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const reviewer = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const rejected = await ReviewService.rejectReview(reviewId, req.body, reviewer);
      ResponseUtil.success(res, 'Message draft rejected successfully', rejected, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reject review';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.startsWith('CANNOT_REJECT')) {
        ResponseUtil.error(res, 'Cannot reject an already finalized review', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_REJECT_ERROR', undefined, 500);
    }
  }

  /**
   * POST /api/v1/reviews/:reviewId/request-revision
   * Requests revision with actionable reviewer feedback.
   */
  static async requestRevision(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const reviewer = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const result = await ReviewService.requestRevision(reviewId, req.body, reviewer);
      ResponseUtil.success(res, 'Revision requested successfully', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request revision';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message.startsWith('CANNOT_REQUEST_REVISION')) {
        ResponseUtil.error(res, 'Cannot request revision on an already finalized review', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_REVISION_ERROR', undefined, 500);
    }
  }

  /**
   * PATCH /api/v1/reviews/:reviewId/assign
   * Reassigns review item to another user.
   */
  static async assign(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const actor = {
        id: req.user?.id || 'system',
        name: req.user?.name || req.user?.email || 'Reviewer'
      };

      const result = await ReviewService.assignReviewer(reviewId, req.body, actor);
      ResponseUtil.success(res, 'Reviewer assigned successfully', result, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to assign reviewer';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message === 'REVIEWER_NOT_FOUND') {
        ResponseUtil.error(res, 'Designated reviewer user not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_ASSIGN_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/reviews/:reviewId/versions
   * Returns immutable version history for a review item.
   */
  static async getVersions(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const versions = await ReviewService.getVersionHistory(reviewId);
      ResponseUtil.success(res, 'Message version history retrieved successfully', versions, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve version history';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_VERSIONS_ERROR', undefined, 500);
    }
  }

  /**
   * GET /api/v1/reviews/:reviewId/history
   * Returns complete review action audit log history.
   */
  static async getHistory(req: Request, res: Response): Promise<void> {
    try {
      const reviewId = req.params.reviewId as string;
      const history = await ReviewService.getReviewActionHistory(reviewId);
      ResponseUtil.success(res, 'Review action history retrieved successfully', history, undefined, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to retrieve review action history';
      if (message === 'INVALID_REVIEW_ID' || message === 'REVIEW_NOT_FOUND') {
        ResponseUtil.error(res, 'Review item not found', 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, message, 'REVIEW_HISTORY_ERROR', undefined, 500);
    }
  }
}
