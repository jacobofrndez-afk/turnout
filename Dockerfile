# Turnout: Next.js app with a persistent Node process (SQLite on a volume, Qloo calls server-side).
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NODE_ENV=production

FROM base AS deps
# better-sqlite3 needs a toolchain to build its native module when no prebuilt binary matches.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci --include=dev

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.ts ./next.config.ts
# SQLite lives on a mounted volume in production (Railway: mount at /data).
ENV DATABASE_PATH=/data/turnout.db
ENV AGENT_INBOX=/data/agent-inbox
ENV QLOO_HOME=/data/qloo
ENV PORT=3000
EXPOSE 3000
CMD ["npm", "run", "start", "--", "--port", "3000"]
