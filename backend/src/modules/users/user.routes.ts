import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/rbac.middleware.js';
import { validateRequest } from '../../middleware/validate.middleware.js';
import { UserRole } from './user.model.js';
import { createUserSchema, updateUserSchema } from './user.validation.js';

const router = Router();

// Restrict all user management routes to ADMIN
router.use(authenticateUser, authorizeRoles(UserRole.ADMIN));

router.get('/', UserController.list);
router.post('/', validateRequest(createUserSchema), UserController.create);
router.get('/:id', UserController.getById);
router.put('/:id', validateRequest(updateUserSchema), UserController.update);
router.delete('/:id', UserController.deactivate);

export default router;
