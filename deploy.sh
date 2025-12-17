#!/bin/bash

# Admin Dashboard Deployment Script
# This script deploys the admin dashboard to the DigitalOcean server

set -e  # Exit on any error

echo "🚀 Starting deployment of Admin Dashboard..."

# Configuration
SERVER_USER="root"
SERVER_HOST="68.183.22.205"
DEPLOY_PATH="/var/www/admin"
NGINX_CONF_PATH="/etc/nginx/sites-available/admin"
NGINX_ENABLED_PATH="/etc/nginx/sites-enabled/admin"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📦 Building project...${NC}"
npm install
npm run build

echo -e "${YELLOW}📤 Deploying to server...${NC}"

# Create deployment directory on server
ssh ${SERVER_USER}@${SERVER_HOST} "mkdir -p ${DEPLOY_PATH}"

# Copy files to server
scp index.html styles.css app.js ${SERVER_USER}@${SERVER_HOST}:${DEPLOY_PATH}/

# Set proper permissions
ssh ${SERVER_USER}@${SERVER_HOST} "chmod -R 755 ${DEPLOY_PATH}"

echo -e "${YELLOW}⚙️  Configuring Nginx...${NC}"

# Create nginx configuration
ssh ${SERVER_USER}@${SERVER_HOST} "cat > ${NGINX_CONF_PATH} << 'EOF'
server {
    listen 80;
    server_name admin.yourdomain.com;  # Change this to your domain or IP

    root ${DEPLOY_PATH};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
EOF"

# Enable site
ssh ${SERVER_USER}@${SERVER_HOST} "ln -sf ${NGINX_CONF_PATH} ${NGINX_ENABLED_PATH}"

# Test nginx configuration
ssh ${SERVER_USER}@${SERVER_HOST} "nginx -t"

# Reload nginx
ssh ${SERVER_USER}@${SERVER_HOST} "systemctl reload nginx"

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 Admin dashboard is now live at: http://${SERVER_HOST}${NC}"
echo -e "${YELLOW}Note: Update the server_name in nginx config to use your domain${NC}"
