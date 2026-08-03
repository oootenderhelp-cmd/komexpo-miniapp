FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY tendrovik-backend/package.json tendrovik-backend/package-lock.json ./tendrovik-backend/
RUN cd tendrovik-backend && npm ci --omit=dev

FROM base AS build
COPY tendrovik-backend/ ./tendrovik-backend/
RUN cd tendrovik-backend && npm ci && npm run build

FROM base AS runner
RUN addgroup -g 1001 -S app && adduser -S app -u 1001
RUN mkdir -p /app/data/uploads && chown -R app:app /app/data

COPY --from=deps /app/tendrovik-backend/node_modules ./tendrovik-backend/node_modules
COPY --from=build /app/tendrovik-backend/dist ./tendrovik-backend/dist
COPY --from=build /app/tendrovik-backend/package.json ./tendrovik-backend/package.json
COPY --from=build /app/tendrovik-backend/drizzle ./tendrovik-backend/drizzle

COPY deploy/scripts/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER app
EXPOSE 3000
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["node", "tendrovik-backend/dist/src/index.js"]
