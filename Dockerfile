# QSeal: gateway + web app in one image. The gateway serves the built app
# from the same origin, so no CORS setup is needed.
#
#   docker build -t qseal .
#   docker run -p 8080:8080 -v qseal-data:/data --env-file backend/.env qseal

FROM node:22-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# "/" = call the API on the same origin the app is served from.
ARG VITE_QSEAL_API_URL=/
ENV VITE_QSEAL_API_URL=$VITE_QSEAL_API_URL
RUN npx vite build

FROM node:22-slim AS gateway
WORKDIR /app/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

FROM node:22-slim
ENV NODE_ENV=production \
    PORT=8080 \
    SERVE_FRONTEND_DIR=/app/web \
    DATABASE_PATH=/data/qseal.db \
    PQC_KEYS_FILE=/data/qseal_keys.json
WORKDIR /app/backend
COPY --from=gateway /app/backend/package.json ./
COPY --from=gateway /app/backend/node_modules ./node_modules
COPY --from=gateway /app/backend/dist ./dist
COPY --from=web /app/dist /app/web
RUN mkdir -p /data && chown node:node /data
USER node
VOLUME /data
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "--disable-warning=ExperimentalWarning", "dist/server.js"]
