FROM node:18 AS generator
WORKDIR /app

# Only copy what's needed from the subfolder
COPY loadbalancer/generate-caddyfile.js .
# Install dotenv
RUN npm install dotenv

# Run the script
RUN node generate-caddyfile.js

FROM caddy:2.7.5
COPY --from=generator /app/Caddyfile /etc/caddy/Caddyfile
