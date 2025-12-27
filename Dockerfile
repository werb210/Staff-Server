# ---------- build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY server ./server
COPY tsconfig.json ./tsconfig.json
COPY tsconfig.*.json ./

RUN npm run build


# ---------- runtime stage ----------
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server/dist ./server/dist
COPY package.json ./

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
