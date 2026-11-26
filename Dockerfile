# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:22-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/
RUN npm run build

# ---------- runtime stage ----------
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=build /app/dist/ ./dist/

EXPOSE 8080
# Streamable HTTP, stateless — required for AI Tools Hub (SEP-2575).
# SOURCE_URL points at the llms-full.txt the server serves from.
CMD ["node", "dist/index.js", "--transport", "http", "--endpoint", "/mcp"]