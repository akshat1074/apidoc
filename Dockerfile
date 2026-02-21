    FROM node:18-alpine AS builder

    WORKDIR /app
    
    COPY package*.json ./
    COPY tsconfig.json ./
    COPY prisma ./prisma
    
    RUN npm ci
    
    COPY src ./src
    
    RUN npx prisma generate
    RUN npm run build
    
 
    FROM node:18-alpine
    
    RUN apk add --no-cache openssl
    
    WORKDIR /app
    
    COPY package*.json ./
    
    RUN npm ci --only=production
    
    COPY --from=builder /app/dist ./dist
    COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
    COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
    COPY prisma ./prisma
    
    RUN npx prisma generate
    
    EXPOSE 3000
    
    CMD ["node", "dist/server.js"]