import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ORA Platform - Researcher Service',
      version: '1.0.0',
      description:
        "Owns roles and role assignments for the Researchers' Network Platform — standalone RBAC for professional networking, groups, and community content (profile/networking/group workflows live in a future pass; this slice is authorization only).",
      contact: { name: 'ORA Platform Engineering' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1`, description: 'Local' },
      { url: 'https://api.ora-platform.org/researchers/api/v1', description: 'Production (via gateway)' },
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
