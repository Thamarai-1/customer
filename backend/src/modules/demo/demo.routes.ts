import { Router } from 'express';
import { DemoController } from './demo.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizePermissions } from '../../middleware/rbac.middleware.js';

const demoRouter = Router();

demoRouter.use(authenticateUser);

// Get scenarios state
demoRouter.get(
  '/scenarios',
  authorizePermissions('demo:manage'),
  DemoController.getScenariosState
);

// Run single scenario
demoRouter.post(
  '/scenarios/:scenarioId/run',
  authorizePermissions('demo:manage'),
  DemoController.runScenario
);

// Reset single scenario
demoRouter.post(
  '/scenarios/:scenarioId/reset',
  authorizePermissions('demo:manage'),
  DemoController.resetScenario
);

// Run refusal demonstration
demoRouter.post(
  '/refusals/:refusalId/run',
  authorizePermissions('demo:manage'),
  DemoController.runRefusal
);

// Reset complete demo dataset
demoRouter.post(
  '/reset-all',
  authorizePermissions('demo:manage'),
  DemoController.resetAllDemoData
);

export default demoRouter;
