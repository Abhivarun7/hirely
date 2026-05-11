# syntax=docker/dockerfile:1.6

# ---------- Builder ----------
FROM node:20-alpine AS builder

WORKDIR /app

# Vite inlines env vars at build time — accept the API URL as a build arg
ARG VITE_API_URL=http://localhost:3000/api/v1
ENV VITE_API_URL=$VITE_API_URL

COPY package.json package-lock.json* ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json vite.config.ts ./
COPY postcss.config.js tailwind.config.js ./
COPY index.html ./
COPY src ./src

RUN npm run build


# ---------- Runner ----------
FROM nginx:1.27-alpine AS runner

# Custom SPA-aware config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Replace default static root with the Vite build output
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
