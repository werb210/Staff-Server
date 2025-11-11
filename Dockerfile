FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
COPY server/package*.json server/
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start"]
