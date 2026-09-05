FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

FROM base AS development

ENV NODE_ENV=development \
    LOG_DIR=/var/log/gateway-service

RUN mkdir -p /var/log/gateway-service

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

FROM base AS builder

RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS production

ENV NODE_ENV=production \
    LOG_DIR=/var/log/gateway-service

WORKDIR /app

COPY --from=builder --chown=node:node /app/package*.json ./
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist

RUN mkdir -p /var/log/gateway-service \
    && chown -R node:node /var/log/gateway-service

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
