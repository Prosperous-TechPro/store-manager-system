FROM cgr.dev/chainguard/node:latest AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

FROM cgr.dev/chainguard/node:latest
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/server.js"]
