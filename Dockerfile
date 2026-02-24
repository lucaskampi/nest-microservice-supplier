FROM node:20-alpine

WORKDIR /app

COPY package*.json packages/shared/package*.json ./
RUN npm ci --only=production

COPY packages/shared ./packages/shared
WORKDIR /app/packages/shared
RUN npm ci --only=production && npm run build

WORKDIR /app

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
RUN npm run build

EXPOSE 4001

CMD ["npm", "start"]
