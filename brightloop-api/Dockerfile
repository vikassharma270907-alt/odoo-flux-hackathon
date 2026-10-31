FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev
COPY . .
COPY --from=web /web/dist ./frontend/dist
EXPOSE 3000
# Seed once on a fresh DB (no-op if already seeded), then start the API+SPA server.
# Runs in /app (WORKDIR) where node and the db/ and src/ paths are guaranteed to resolve.
CMD ["sh", "-c", "node db/seed-if-empty.js && node src/server.js"]
