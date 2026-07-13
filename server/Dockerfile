# MacrashPDF server — Node + Ghostscript
# Render's native Node runtime does not include Ghostscript, so the server
# deploys as a Docker service.
FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 5000

CMD ["node", "server.js"]
