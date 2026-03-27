FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc

ENV NVM_RELAYS="wss://relay.damus.io,wss://nos.lol"
ENV LIGHTNING_BACKEND="mock"

CMD ["node", "dist/relay/main.js"]
