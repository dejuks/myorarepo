# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# ---- Dependencies (cached layer) ----
FROM base AS dependencies
COPY package*.json .npmrc ./
RUN npm ci

# ---- Build ----
# Vite bakes VITE_* env vars into the bundle at BUILD time, unlike the backend
# services' runtime env vars — so the API base URL comes in as a build-arg.
FROM dependencies AS build
ARG VITE_API_BASE_URL=http://localhost:8080/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
COPY tsconfig*.json vite.config.ts index.html ./
COPY public ./public
COPY src ./src
RUN npm run build

# ---- Final runtime image: static files served by Nginx ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /usr/src/app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
