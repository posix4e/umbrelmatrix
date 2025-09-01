# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install ALL dependencies for building
RUN npm ci

# Copy application files
COPY . .

# Production stage
FROM node:18-alpine

# Install wget for healthchecks
RUN apk add --no-cache wget

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy application files from builder
COPY --from=builder /app/server.js ./
COPY --from=builder /app/public ./public/

# Create data directory and set permissions
RUN mkdir -p /data /config && \
    chown -R node:node /app /data /config

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["node", "server.js"]