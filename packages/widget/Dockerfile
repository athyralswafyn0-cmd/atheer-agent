FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 vite

COPY --from=builder --chown=vite:nodejs /app/dist ./dist
COPY --from=builder --chown=vite:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=vite:nodejs /app/package.json ./package.json

USER vite

EXPOSE 5173

ENV PORT 5173
ENV HOST 0.0.0.0

CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173"]