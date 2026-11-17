import { Router } from 'express';
import { AuditController } from './audit.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizePermissions } from '../../middleware/rbac.middleware.js';

const auditRouter = Router();

auditRouter.use(authenticateUser);

auditRouter.get(
  '/logs',
  authorizePermissions('audit:read'),
  AuditController.listLogs
);

export default auditRouter;
