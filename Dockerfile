# Build stage
FROM node:20-alpine AS builder

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma/ prisma/

# Install all dependencies (including dev dependencies)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY src/ src/

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install curl for health check and dependencies for Prisma
RUN apk add --no-cache curl python3 make g++

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma/ prisma/

# Install production dependencies and prisma
RUN npm ci --only=production && \
    npm install prisma @prisma/client && \
    npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 8602

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8602/health || exit 1

# Start command
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
