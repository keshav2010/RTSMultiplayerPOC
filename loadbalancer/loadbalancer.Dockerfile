FROM node:18 AS generator
WORKDIR /app
COPY . .
RUN npm install dotenv
RUN node generate-caddyfile.js

FROM caddy:2.7.5
COPY --from=generator /app/Caddyfile /etc/caddy/Caddyfile
