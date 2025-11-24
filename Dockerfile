# ------------ BASE IMAGE ------------
FROM node:20-alpine AS base

# Set working directory to the server folder (where the actual backend lives)
WORKDIR /app

# Copy only package manifests first for proper layer caching
COPY package*.json ./
COPY server/package*.json ./server/

# Install root deps and server deps
RUN npm install
RUN cd server && npm install

# Copy full project
COPY . .

# Build the TypeScript backend
RUN cd server && npm run build

# Azure injects PORT; respect it.
ENV PORT=8080
EXPOSE 8080

# Start the compiled server directly
CMD ["node", "server/dist/index.js"]
