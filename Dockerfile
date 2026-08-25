# ── Stage 1: Build frontend ───────────────────────────────────────────────────
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend

# 1a. Install shared package deps (zod) so tsc can resolve imports inside shared/
COPY packages/shared/package*.json /app/shared/
RUN cd /app/shared && npm install --prefer-offline

# 1b. Copy shared source (resolved via Vite alias ../shared/src/index.ts)
COPY packages/shared/src /app/shared/src

# 1c. Install frontend deps, then build
COPY packages/frontend/package*.json ./
RUN npm ci
COPY packages/frontend/ ./
RUN npm run build

# ── Stage 2: Build backend ────────────────────────────────────────────────────
FROM node:24-alpine AS backend-build
RUN apk add --no-cache python3 make g++
WORKDIR /app/backend

# 2a. Install shared package deps (zod) so tsc can resolve imports inside shared/
COPY packages/shared/package*.json /app/shared/
RUN cd /app/shared && npm install --prefer-offline

# 2b. Copy shared source (resolved via tsconfig paths ../shared/src/index.ts)
COPY packages/shared/src /app/shared/src

# 2c. Install backend deps, then build
COPY packages/backend/package*.json ./
RUN npm ci
COPY packages/backend/ ./
RUN npm run build

# ── Stage 3: Production ───────────────────────────────────────────────────────
FROM node:24-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=backend-build /app/backend/node_modules ./node_modules
COPY --from=backend-build /app/backend/package.json ./
COPY --from=frontend-build /app/frontend/dist ./public

VOLUME /app/data
ENV DATABASE_PATH=/app/data/budget.db
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]
