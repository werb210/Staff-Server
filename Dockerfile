FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache bash

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --ignore-scripts
RUN npm ci --prefix server

COPY . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start"]
