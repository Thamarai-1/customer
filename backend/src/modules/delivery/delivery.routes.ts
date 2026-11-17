import { Router } from 'express';
import { DeliveryController } from './delivery.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizePermissions } from '../../middleware/rbac.middleware.js';

const deliveryRouter = Router();

// All delivery endpoints require authentication
deliveryRouter.use(authenticateUser);

// Metric stats
deliveryRouter.get(
  '/dashboard/stats',
  authorizePermissions('deliveries:read'),
  DeliveryController.getDashboardStats
);

// Customer specific delivery history
deliveryRouter.get(
  '/customers/:customerId',
  authorizePermissions('deliveries:read'),
  DeliveryController.getDeliveriesByCustomer
);

// Single delivery details
deliveryRouter.get(
  '/:deliveryId',
  authorizePermissions('deliveries:read'),
  DeliveryController.getDeliveryDetails
);

// List all deliveries with filters
deliveryRouter.get(
  '/',
  authorizePermissions('deliveries:read'),
  DeliveryController.listDeliveries
);

// Create delivery (MOCK or DRAFT_ONLY)
deliveryRouter.post(
  '/',
  authorizePermissions('deliveries:create'),
  DeliveryController.createDelivery
);

// Retry failed delivery
deliveryRouter.post(
  '/:deliveryId/retry',
  authorizePermissions('deliveries:retry'),
  DeliveryController.retryDelivery
);

export default deliveryRouter;
