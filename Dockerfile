FROM node:22-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY server/ ./server/
COPY client/ ./client/

EXPOSE 8080

ENTRYPOINT ["node", "server/index.js"]
