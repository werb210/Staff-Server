FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY server ./server
RUN npm run build

EXPOSE 3000

CMD ["node", "server/dist/index.js"]
