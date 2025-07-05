FROM node:18 AS builder
WORKDIR /app

COPY . .

RUN npm install dotenv

# Don't run the script at build time

FROM caddy:2.7.5

# Copy generate-caddyfile script
COPY --from=builder /app/generate-caddyfile.js /app/generate-caddyfile.js
COPY --from=builder /app/node_modules /app/node_modules

# Add entrypoint to generate the file before starting Caddy
COPY --from=builder /app/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
