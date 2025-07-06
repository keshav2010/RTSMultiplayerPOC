FROM nginx:alpine

# Install bash and core tools (for debugging and tail)
RUN apk add --no-cache bash curl

# Create log directory explicitly (just in case)
RUN mkdir -p /var/log/nginx

# Copy custom NGINX config
COPY nginx.conf /etc/nginx/nginx.conf

# Optionally serve a landing page
COPY public/ /usr/share/nginx/html

# Start NGINX and continuously tail the error log
CMD ["/bin/sh", "-c", "nginx && tail -F /var/log/nginx/error.log"]
