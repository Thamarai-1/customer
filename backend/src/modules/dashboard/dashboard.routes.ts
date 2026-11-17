import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';

const dashboardRouter = Router();

dashboardRouter.get('/overview', authenticateUser, DashboardController.getOverview);

export default dashboardRouter;
