FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/

RUN npm ci --ignore-scripts
RUN npm ci --prefix server

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/index.js"]
