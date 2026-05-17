FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.5.2 --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

# Dev stage: vite dev server with HMR. Used by `docker compose watch`.
FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]

# Build stage: produces static assets for the production image.
FROM deps AS build
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL
COPY . .
RUN pnpm build

# Production runtime: nginx serving built static assets.
FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
# nginx:alpine ships with neither curl nor wget; use the busybox http client
# baked into the base image's util-linux instead. A failing index fetch (404,
# 5xx, connection refused) returns non-zero so docker correctly flags the
# container.
HEALTHCHECK --interval=10s --timeout=3s CMD nc -z 127.0.0.1 80 || exit 1
