import { Router } from 'express';
import { HealthController } from '@api/controllers/health.controller';

const router = Router();
const controller = new HealthController();

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness probe
 *     tags: [Health]
 *     responses:
 *       200: { description: Service process is alive }
 */
router.get('/health', controller.liveness);

/**
 * @openapi
 * /health/ready:
 *   get:
 *     summary: Readiness probe (checks DB and Redis connectivity)
 *     tags: [Health]
 *     responses:
 *       200: { description: Service is ready to accept traffic }
 *       503: { description: One or more dependencies are unavailable }
 */
router.get('/health/ready', controller.readiness);

export { router as healthRouter };
