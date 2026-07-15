FROM node:20-alpine

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

# Install pnpm and Prisma
RUN npm install -g pnpm@9 && \
    npm install -g prisma@5

# Copy package files from root and auth-service
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY package.json ./
COPY services/auth-service/package.json services/auth-service/

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile --prod=false --filter=@atheer/auth-service...

# Copy source code
COPY . .

# Generate Prisma Client
RUN cd services/auth-service && npx prisma generate

# Build service
RUN cd services/auth-service && npm run build

# Create necessary directories
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app/logs

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start command
CMD ["node", "services/auth-service/dist/index.js"]