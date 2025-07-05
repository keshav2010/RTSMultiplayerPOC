#!/bin/sh

# Generate the Caddyfile
node /app/generate-caddyfile.js

# Run Caddy
caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
