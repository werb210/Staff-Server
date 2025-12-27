FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY server ./server

# build TS -> dist (root)
RUN npm run build

EXPOSE 3000

# run compiled output from root dist
CMD ["node", "dist/index.js"]
