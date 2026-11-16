import { Router } from 'express';
import healthRouter from './health.routes.js';
import authRouter from '../modules/auth/auth.routes.js';
import userRouter from '../modules/users/user.routes.js';
import customerRouter from '../modules/customers/customer.routes.js';
import billingRouter from '../modules/billing/billing.routes.js';
import segmentationRouter from '../modules/segmentation/segmentation.routes.js';
import campaignsRouter from '../modules/campaigns/campaigns.routes.js';
import offersRouter from '../modules/offers/offers.routes.js';
import strategiesRouter from '../modules/strategies/strategies.routes.js';
import billingPoliciesRouter from '../modules/billing-policies/billing-policies.routes.js';
import policyEngineRouter from '../modules/policy-engine/policy-engine.routes.js';
import aiRouter from '../modules/ai/ai.routes.js';
import messageGenerationRouter from '../modules/message-generation/message-generation.routes.js';
import complianceRouter from '../modules/compliance/compliance.routes.js';

const apiRouter = Router();

// Mount Phase 1, Phase 2, Phase 3, Phase 4, Phase 5 & Phase 6 Modules under /api/v1
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/segmentation', segmentationRouter);
apiRouter.use('/campaigns', campaignsRouter);
apiRouter.use('/offers', offersRouter);
apiRouter.use('/strategies', strategiesRouter);
apiRouter.use('/billing-policies', billingPoliciesRouter);
apiRouter.use('/policy-engine', policyEngineRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/message-generation', messageGenerationRouter);
apiRouter.use('/compliance', complianceRouter);

export default apiRouter;
