FROM node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_E2E_SALT_PREFIX=pokoje-czatu-e2e-v2
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_E2E_SALT_PREFIX=$NEXT_PUBLIC_E2E_SALT_PREFIX

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

COPY app ./app
COPY components ./components
COPY context ./context
COPY hooks ./hooks
COPY lib ./lib
COPY public ./public
COPY middleware.js next.config.mjs jsconfig.json server.js ./

RUN npm run build

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80
ENV HOST=0.0.0.0
ENV QUIET_LOGS=1

COPY package.json package-lock.json* ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/next.config.mjs ./next.config.mjs

EXPOSE 80

CMD ["node", "server.js"]
