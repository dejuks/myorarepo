import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ORA Platform - Wiki Service',
      version: '1.0.0',
      description:
        'The Oromo Wikipedia Platform: articles with full revision history, categories, tags, and a Draft -> Submitted -> Under Review -> Approved -> Published -> Archived review/approval workflow, plus standalone RBAC (roles and role assignments) for content moderation and governance. Fully standalone — no synchronous calls to any other platform service.',
      contact: { name: 'ORA Platform Engineering' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1/wiki`, description: 'Local' },
      { url: 'https://api.ora-platform.org/api/v1/wiki', description: 'Production (via gateway)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts', './src/application/dto/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
