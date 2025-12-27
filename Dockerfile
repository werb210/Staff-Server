FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --ignore-scripts
RUN npm ci --prefix server

COPY . .

# 🔴 FORCE correct TS build (this is the bug)
RUN npx tsc -p server/tsconfig.json

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
