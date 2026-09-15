FROM node:20-alpine AS base
WORKDIR /usr/src/app
RUN apk add --no-cache dumb-init

FROM base AS dependencies
COPY package*.json ./
RUN npm ci --include=dev

FROM dependencies AS build
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM base AS prod-dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production
RUN addgroup -S ora && adduser -S ora -G ora

COPY --from=prod-dependencies /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package*.json ./

USER ora
EXPOSE 4009

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4009/health', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
