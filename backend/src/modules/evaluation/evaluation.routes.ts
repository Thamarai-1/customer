import { Router } from 'express';
import { EvaluationController } from './evaluation.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizePermissions } from '../../middleware/rbac.middleware.js';

const evaluationRouter = Router();

evaluationRouter.use(authenticateUser);

// Evaluation dashboard overview
evaluationRouter.get(
  '/overview',
  authorizePermissions('evaluation:read'),
  EvaluationController.getOverview
);

// Confusion matrix & segmentation metrics
evaluationRouter.get(
  '/segmentation',
  authorizePermissions('evaluation:read'),
  EvaluationController.getSegmentationEvaluation
);

// Export JSON or CSV
evaluationRouter.get(
  '/report',
  authorizePermissions('evaluation:read'),
  EvaluationController.exportReport
);

export default evaluationRouter;
