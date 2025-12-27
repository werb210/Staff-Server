FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --ignore-scripts
RUN npm ci --prefix server

COPY . .

# 🔴 THIS IS THE FIX
RUN npm run --prefix server build

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/dist/index.js"]
