# syntax=docker/dockerfile:1

FROM node:20-alpine AS builder
WORKDIR /app

# Install deps first for better layer caching
COPY package.json package-lock.json* ./
RUN npm ci

# Copy source
COPY . .

# Build frontend + bundle server
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Only copy production artifacts
COPY --from=builder /app/package.json /app/package-lock.json* ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/data ./data

# Install only production dependencies
RUN npm ci --omit=dev

# Default port (matches server.ts default PORT=3000)
ENV PORT=3000

EXPOSE 3000

CMD ["node", "dist/server.cjs"]

