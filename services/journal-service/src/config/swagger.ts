import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ORA Platform - Journal Service',
      version: '1.0.0',
      description:
        'Owns roles and role assignments for the ORA Journal Management System — standalone RBAC for journal editorial workflows (manuscript submission, peer review, editorial decisions live in a future pass; this slice is authorization only).',
      contact: { name: 'ORA Platform Engineering' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1`, description: 'Local' },
      { url: 'https://api.ora-platform.org/api/v1/journals', description: 'Production (via gateway)' },
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
