# syntax=docker/dockerfile:1.4

# ----------------------
# Base builder image
# ----------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Provide a safe placeholder so prisma generate succeeds during image builds.
ENV DATABASE_URL="postgresql://placeholder:password@localhost:5432/placeholder"

# Copy dependency manifests first to leverage Docker layer caching
COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig*.json ./
COPY server ./server
COPY startup.sh ./startup.sh

# Install all dependencies (including dev deps for TypeScript build)
RUN npm ci

# Ensure the Prisma client is generated before compilation
RUN npm run postinstall

# Build the TypeScript backend to ./dist
RUN npm run build

# ----------------------
# Runtime image
# ----------------------
FROM node:20-alpine AS runner
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app

# Install only production dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev

# Copy the compiled app and supporting files
COPY --from=builder /app/dist ./dist
COPY startup.sh ./startup.sh

EXPOSE 8080

# Start the compiled server directly
CMD ["node", "dist/index.js"]
