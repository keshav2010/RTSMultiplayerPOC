FROM nginx:alpine

# Copy custom NGINX config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Optionally serve a landing page
COPY public/ /usr/share/nginx/html