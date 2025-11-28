# ==============================================
# Multi-Stage Production Dockerfile
# Describe It - Next.js 15.5 Application
# ==============================================
# Optimized for size, security, and performance
# Uses standalone output mode for minimal runtime

# ==============================================
# STAGE 1: Dependencies
# ==============================================
FROM node:20.11.0-alpine AS deps

# Install security updates and required system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    libc6-compat \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies with frozen lockfile for reproducibility
# Separate production and development dependencies for better caching
RUN npm ci --frozen-lockfile && \
    npm cache clean --force

# ==============================================
# STAGE 2: Builder
# ==============================================
FROM node:20.11.0-alpine AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=true

# Build Next.js application with standalone output
RUN npm run build

# ==============================================
# STAGE 3: Production Runtime
# ==============================================
FROM node:20.11.0-alpine AS runner

# Install security updates, dumb-init for proper signal handling, and sharp dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    # Sharp dependencies for image optimization
    vips-dev \
    fftw-dev \
    build-base \
    python3 \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001 -G nodejs

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy package.json for version info
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Install sharp in production for image optimization
RUN npm install --omit=dev --ignore-scripts sharp && \
    npm cache clean --force

# Create directories for logs and temp files
RUN mkdir -p /app/logs /tmp && \
    chown -R nextjs:nodejs /app/logs /tmp

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Use dumb-init to handle signals properly (PID 1 problem)
ENTRYPOINT ["dumb-init", "--"]

# Start the Next.js standalone server
CMD ["node", "server.js"]

# Metadata labels
LABEL maintainer="Describe It Team" \
      version="1.0.0" \
      description="Production-ready Describe It Next.js application" \
      org.opencontainers.image.title="Describe It" \
      org.opencontainers.image.description="AI-powered image description generator" \
      org.opencontainers.image.vendor="Describe It" \
      org.opencontainers.image.licenses="MIT"
