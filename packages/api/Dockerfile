# Atheer Agent API - Production Dockerfile
# Single-stage build for simplicity and reliability

FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    openssl \
    ca-certificates \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

WORKDIR /app

# Install pnpm and Prisma 5.x
RUN npm install -g pnpm@9 && \
    npm install -g prisma@5

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/api/package.json packages/api/

# Install dependencies
RUN pnpm install --frozen-lockfile --prod=false --filter=@atheer/agent-api...

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd packages/api && npx prisma generate

# Build API
RUN cd packages/api && npm run build

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs

EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start command
CMD ["node", "packages/api/dist/index.js"]