# Deployment Guide

This guide covers deploying the Service Vault application in various environments, from development to production self-hosting.

## Overview

Service Vault is designed for **self-hosting** and supports multiple deployment strategies:

- **Docker containerization** (recommended)
- **Traditional server deployment**
- **Cloud platform deployment** (Vercel, Railway, etc.)
- **Local development setup**

## Prerequisites

### System Requirements

**Minimum Requirements:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 10GB SSD
- Network: 1 Mbps upload/download

**Recommended Requirements:**
- CPU: 4+ cores
- RAM: 8GB+
- Storage: 50GB+ SSD
- Network: 10+ Mbps

### Software Dependencies

- **Node.js**: 18+ LTS
- **PostgreSQL**: 14+
- **Docker**: 20+ (for containerized deployment)
- **SSL Certificate**: Required for production

## Docker Deployment (Recommended)

### Production Docker Setup

**1. Create Production Docker Compose:**

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://servicevault:${DB_PASSWORD}@db:5432/servicevault
      - NEXTAUTH_URL=https://yourdomain.com
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    depends_on:
      - db
    restart: unless-stopped
    volumes:
      - app-data:/app/data

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=servicevault
      - POSTGRES_USER=servicevault
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped
    ports:
      - "5432:5432"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres-data:
  app-data:
```

**2. Create Production Dockerfile:**

```dockerfile
# Dockerfile.prod
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

**3. Create Environment File:**

```bash
# .env.production
DB_PASSWORD=your_secure_database_password
NEXTAUTH_SECRET=your_super_secure_nextauth_secret_key_min_32_chars
LICENSING_API_KEY=your_licensing_api_key_if_applicable
```

**4. Deploy:**

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Seed initial data
docker-compose -f docker-compose.prod.yml exec app npx prisma db seed
```

### Nginx Configuration

```nginx
# nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # HTTP redirect to HTTPS
    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;

        client_max_body_size 100M;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

## Traditional Server Deployment

### Manual Server Setup

**1. Server Preparation:**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx
```

**2. Database Setup:**

```bash
# Create database user and database
sudo -u postgres psql
CREATE USER servicevault WITH PASSWORD 'your_secure_password';
CREATE DATABASE servicevault OWNER servicevault;
GRANT ALL PRIVILEGES ON DATABASE servicevault TO servicevault;
\q
```

**3. Application Setup:**

```bash
# Clone repository
git clone <your-repository-url> /var/www/servicevault
cd /var/www/servicevault

# Install dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Build application
npm run build

# Set up environment
cp .env.example .env
# Edit .env with production values

# Run database migrations
npx prisma migrate deploy

# Seed initial data (if available)
npx prisma db seed
```

**4. PM2 Process Management:**

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'servicevault',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/servicevault',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/servicevault/error.log',
    out_file: '/var/log/servicevault/out.log',
    log_file: '/var/log/servicevault/combined.log'
  }]
};
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

**5. Nginx Configuration:**

```bash
# Create Nginx site configuration
sudo cat > /etc/nginx/sites-available/servicevault << EOF
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable site
sudo ln -s /etc/nginx/sites-available/servicevault /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Set up SSL with Certbot
sudo certbot --nginx -d yourdomain.com
```

## Cloud Platform Deployment

### Vercel Deployment

**1. Configure for Vercel:**

```json
{
  "name": "servicevault",
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_URL": "@nextauth_url",
    "NEXTAUTH_SECRET": "@nextauth_secret"
  }
}
```

**2. Deploy:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
```

### Railway Deployment

**1. Create railway.json:**

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE"
  }
}
```

**2. Deploy via CLI:**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway link
railway up
```

## Environment Configuration

### Production Environment Variables

```env
# Application
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-super-secure-secret-min-32-characters"

# Licensing (optional)
LICENSING_API_URL="https://api.licensing-service.com"
LICENSING_API_KEY="your-license-key"

# Email (optional)
SMTP_HOST="smtp.yourdomain.com"
SMTP_PORT=587
SMTP_USER="noreply@yourdomain.com"
SMTP_PASS="your-smtp-password"

# Security
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000

# Monitoring (optional)
SENTRY_DSN="your-sentry-dsn"
ANALYTICS_ID="your-analytics-id"
```

### Security Configuration

**1. Firewall Setup:**

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Only allow database access from application
sudo ufw allow from <app-server-ip> to any port 5432
```

**2. SSL/TLS Configuration:**

```bash
# Generate strong DH parameters
sudo openssl dhparam -out /etc/ssl/certs/dhparam.pem 2048

# Update Nginx SSL configuration
ssl_dhparam /etc/ssl/certs/dhparam.pem;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_stapling on;
ssl_stapling_verify on;
```

## Database Management

### Backup Strategy

**1. Automated Backups:**

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/servicevault"
DB_NAME="servicevault"

# Create backup
pg_dump -h localhost -U servicevault $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Compress backup
gzip $BACKUP_DIR/backup_$DATE.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/
```

**2. Automated Backup with Cron:**

```bash
# Add to crontab
0 2 * * * /path/to/backup-db.sh
```

### Migration Management

```bash
# Production migration workflow
npx prisma migrate deploy

# Verify migration
npx prisma db pull

# Rollback if needed (manual process)
# Restore from backup and re-run previous migration
```

## Monitoring and Maintenance

### Health Checks

**1. Application Health Check:**

```typescript
// /src/app/api/health/route.ts
export async function GET() {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    });
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        error: error.message 
      },
      { status: 503 }
    );
  }
}
```

**2. System Monitoring:**

```bash
# PM2 monitoring
pm2 monit

# System resources
htop
df -h
free -h

# Database monitoring
sudo -u postgres psql servicevault -c "SELECT * FROM pg_stat_activity;"
```

### Log Management

**1. Application Logs:**

```bash
# PM2 logs
pm2 logs servicevault

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

**2. Log Rotation:**

```bash
# Configure logrotate
sudo cat > /etc/logrotate.d/servicevault << EOF
/var/log/servicevault/*.log {
    daily
    missingok
    rotate 14
    compress
    notifempty
    create 0644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

## Performance Optimization

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_time_entries_user_id ON "TimeEntry"("userId");
CREATE INDEX idx_time_entries_account_id ON "TimeEntry"("accountId");
CREATE INDEX idx_account_memberships_user_account ON "AccountMembership"("userId", "accountId");

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "User" WHERE email = 'user@example.com';
```

### Application Optimization

```bash
# Enable Next.js static optimization
# Ensure pages are statically generated where possible

# Optimize images
# Use Next.js Image component for automatic optimization

# Enable compression
# Gzip/Brotli compression in Nginx configuration
```

## Troubleshooting

### Common Issues

**1. Database Connection Issues:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Check database connectivity
psql -h localhost -U servicevault -d servicevault -c "SELECT version();"
```

**2. Application Won't Start:**
```bash
# Check PM2 status
pm2 status

# Check application logs
pm2 logs servicevault --lines 100

# Check system resources
free -h
df -h
```

**3. Permission Errors:**
```bash
# Check file permissions
ls -la /var/www/servicevault

# Fix ownership
sudo chown -R www-data:www-data /var/www/servicevault
```

### Recovery Procedures

**1. Database Recovery:**
```bash
# Stop application
pm2 stop servicevault

# Restore from backup
gunzip backup_YYYYMMDD_HHMMSS.sql.gz
psql -h localhost -U servicevault servicevault < backup_YYYYMMDD_HHMMSS.sql

# Restart application
pm2 start servicevault
```

**2. Application Recovery:**
```bash
# Restart application
pm2 restart servicevault

# Rebuild if needed
cd /var/www/servicevault
npm run build
pm2 restart servicevault
```

## Scaling Considerations

### Horizontal Scaling

- **Load Balancer**: Use Nginx or cloud load balancer for multiple instances
- **Database**: Consider read replicas for heavy read workloads
- **Session Storage**: Use Redis for session management across instances
- **File Storage**: Use cloud storage for file uploads

### Vertical Scaling

- **CPU**: Monitor CPU usage and scale cores as needed
- **Memory**: Monitor memory usage and increase RAM for larger datasets
- **Storage**: Use SSD storage and monitor disk usage

This deployment guide provides comprehensive instructions for deploying Service Vault in production environments with proper security, monitoring, and maintenance procedures.