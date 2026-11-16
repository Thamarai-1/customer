import { Router } from 'express';
import healthRouter from './health.routes.js';
import authRouter from '../modules/auth/auth.routes.js';
import userRouter from '../modules/users/user.routes.js';
import customerRouter from '../modules/customers/customer.routes.js';
import billingRouter from '../modules/billing/billing.routes.js';
import segmentationRouter from '../modules/segmentation/segmentation.routes.js';

const apiRouter = Router();

// Mount Phase 1, Phase 2 & Phase 3 Modules under /api/v1
apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/customers', customerRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/segmentation', segmentationRouter);

export default apiRouter;
