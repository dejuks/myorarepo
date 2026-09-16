import { Router } from 'express';
import { HealthController } from '@api/controllers/health.controller';

const router = Router();
const controller = new HealthController();

router.get('/health', controller.liveness);
router.get('/health/ready', controller.readiness);

export { router as healthRouter };
