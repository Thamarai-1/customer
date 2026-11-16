import { Router } from 'express';
import { AIController } from './ai.controller.js';
import { authenticateUser } from '../../middleware/auth.middleware.js';

const router = Router();

router.use(authenticateUser);

router.get('/providers', AIController.listProviders);

export default router;
