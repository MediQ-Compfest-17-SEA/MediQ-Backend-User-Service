# ---- Stage 1: Build ----
FROM node:18-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

COPY prisma ./prisma
RUN npx prisma generate

RUN npm run build

# ---- Stage 2: Production ----
FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

# Salin hasil build dari stage 'builder'
COPY --from=builder /app/dist ./dist

# Salin skema dan client prisma yang sudah digenerate
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["node", "dist/main"]