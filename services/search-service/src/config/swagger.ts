import swaggerJSDoc from 'swagger-jsdoc';
import { env } from '@config/env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'ORA Platform - Search Service',
      version: '1.0.0',
      description:
        'Cross-domain search over every content service (journals, ebooks, library, repository, wiki, researcher profiles). A derived, rebuildable index maintained entirely from consumed domain events — this service never originates data and exposes no write/ingest endpoints.',
      contact: { name: 'ORA Platform Engineering' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api/v1`, description: 'Local' },
      { url: 'https://api.ora-platform.org/search/api/v1', description: 'Production (via gateway)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts', './src/application/dto/*.ts'],
};

export const swaggerSpec = swaggerJSDoc(options);
