# CI/CD Deployment Setup Guide

This guide will help you set up automated deployment of the Admin Dashboard to DigitalOcean using GitHub Actions.

## Prerequisites

- GitHub repository for this project
- DigitalOcean server (68.183.22.205)
- SSH access to the server
- Nginx installed on the server

## Setup Steps

### 1. Initialize Git Repository

```bash
cd /Users/rolflouisdor/Desktop/RMH-Real-Estate/Audio-admin
git init
git add .
git commit -m "Initial commit: Admin Dashboard with CI/CD"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository
2. Name it: `audio-admin-dashboard`
3. Don't initialize with README (we already have files)
4. Copy the repository URL

### 3. Connect Local to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/audio-admin-dashboard.git
git branch -M main
git push -u origin main
```

### 4. Generate SSH Key for Deployment

On your local machine:

```bash
# Generate a new SSH key pair for deployment
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy_key -N ""

# Display the private key (you'll add this to GitHub Secrets)
cat ~/.ssh/github_deploy_key

# Display the public key (you'll add this to your server)
cat ~/.ssh/github_deploy_key.pub
```

### 5. Add SSH Public Key to Server

Copy the public key and add it to your server:

```bash
ssh root@68.183.22.205

# On the server:
mkdir -p ~/.ssh
echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
exit
```

### 6. Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

1. **SSH_PRIVATE_KEY**
   - Value: Contents of `~/.ssh/github_deploy_key` (the private key)

2. **SERVER_HOST**
   - Value: `68.183.22.205`

3. **SERVER_USER**
   - Value: `root`

4. **DEPLOY_PATH**
   - Value: `/var/www/admin`

### 7. Prepare Server (One-time setup)

SSH into your server and run:

```bash
ssh root@68.183.22.205

# Install Nginx if not already installed
apt update
apt install -y nginx

# Create deployment directory
mkdir -p /var/www/admin

# Copy the nginx configuration
cat > /etc/nginx/sites-available/admin << 'EOF'
server {
    listen 80;
    server_name 68.183.22.205;

    root /var/www/admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(css|js|jpg|jpeg|png|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
EOF

# Enable the site
ln -sf /etc/nginx/sites-available/admin /etc/nginx/sites-enabled/admin

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Enable nginx to start on boot
systemctl enable nginx
```

### 8. Update API URL (if needed)

If your API server is on the same machine, update the API URL in `app.ts`:

```typescript
const API_BASE_URL = 'http://localhost:8080';
// or
const API_BASE_URL = 'http://68.183.22.205:8080';
```

Then rebuild and commit:

```bash
npm run build
git add app.ts app.js
git commit -m "Update API URL"
git push
```

## Usage

### Automatic Deployment

Every time you push to the `main` branch, GitHub Actions will:

1. ✅ Checkout your code
2. ✅ Install dependencies
3. ✅ Build TypeScript
4. ✅ Deploy to DigitalOcean
5. ✅ Set proper permissions

### Manual Deployment

You can also deploy manually using the deployment script:

```bash
chmod +x deploy.sh
./deploy.sh
```

Or trigger a manual deployment from GitHub:
- Go to Actions tab → Deploy Admin Dashboard → Run workflow

### Monitor Deployments

1. Go to your GitHub repository
2. Click on **Actions** tab
3. See all deployment runs and their status

## Access Your Dashboard

Once deployed, access your admin dashboard at:

**http://68.183.22.205/**

Or if you set up a domain:

**http://admin.yourdomain.com/**

## Troubleshooting

### Deployment fails with SSH error

```bash
# Test SSH connection
ssh -i ~/.ssh/github_deploy_key root@68.183.22.205

# If it fails, regenerate keys and re-add to GitHub Secrets
```

### Nginx not serving the files

```bash
# Check nginx status
ssh root@68.183.22.205
systemctl status nginx

# Check nginx logs
tail -f /var/log/nginx/admin_error.log

# Verify files were deployed
ls -la /var/www/admin
```

### Can't connect to API

```bash
# Start the API service on your server
ssh root@68.183.22.205
cd /opt/stream-audio/stream-audio
docker-compose -f docker-compose.prod.yml up -d auth-service

# Check if it's running
docker ps
curl localhost:8080/admin/stats
```

## Security Enhancements (Optional)

### Add HTTPS with Let's Encrypt

```bash
ssh root@68.183.22.205

# Install certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
certbot --nginx -d admin.yourdomain.com

# Certificates will auto-renew
```

### Restrict Admin Access by IP

Add to nginx config:

```nginx
location / {
    allow YOUR_IP_ADDRESS;
    deny all;
    try_files $uri $uri/ /index.html;
}
```

## Workflow Summary

1. **Make changes** to your admin dashboard locally
2. **Test locally**: `npm run build && npm run serve`
3. **Commit changes**: `git add . && git commit -m "Your changes"`
4. **Push to GitHub**: `git push`
5. **GitHub Actions** automatically deploys to DigitalOcean
6. **Access live dashboard** at http://68.183.22.205/

## Files Overview

- `.github/workflows/deploy.yml` - GitHub Actions CI/CD pipeline
- `deploy.sh` - Manual deployment script
- `nginx.conf` - Nginx configuration for the dashboard
- `DEPLOYMENT.md` - This guide

---

**Next Steps:**
1. Push this repository to GitHub
2. Add the GitHub Secrets
3. Configure the server
4. Push any change to trigger the first deployment!
