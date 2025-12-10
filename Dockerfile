# ==============================================
# Multi-Stage Production Dockerfile
# Describe It - Next.js 15.5 Application
# ==============================================
# Optimized for size, security, and performance
# Uses standalone output mode for minimal runtime

# ==============================================
# STAGE 1: Dependencies
# ==============================================
FROM node:20-alpine AS deps

# Install security updates and required system dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    libc6-compat \
    python3 \
    make \
    g++ \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with frozen lockfile for reproducibility
# Separate production and development dependencies for better caching
RUN npm ci --omit=dev && \
    npm cache clean --force

# ==============================================
# STAGE 2: Builder
# ==============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package.json package-lock.json* ./
RUN npm ci && npm cache clean --force

# Copy application source
COPY . .

# Set build-time environment variables
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    SKIP_ENV_VALIDATION=true

# Build arguments for optional build-time configuration
ARG SENTRY_ORG
ARG SENTRY_PROJECT
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}

# Build Next.js application with standalone output
RUN npm run build

# ==============================================
# STAGE 3: Production Runtime
# ==============================================
FROM node:20-alpine AS runner

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
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs -G nodejs

# Set production environment
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME="0.0.0.0"

# Copy public assets with correct ownership
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy standalone output from builder
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

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
