FROM node:18 AS generator
WORKDIR /app

# Copy project files first
COPY . .

# Install dependencies
RUN npm install dotenv

# Now run the script
RUN node generate-caddyfile.js

FROM caddy:2.7.5
COPY --from=generator /app/Caddyfile /etc/caddy/Caddyfile
