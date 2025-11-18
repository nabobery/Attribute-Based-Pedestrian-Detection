# Deployment Guide

Complete guide for deploying the Pedestrian Attribute Detection system to production.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Security Checklist](#security-checklist)
- [Deployment Options](#deployment-options)
  - [Option 1: Docker Deployment](#option-1-docker-deployment)
  - [Option 2: Heroku](#option-2-heroku)
  - [Option 3: AWS](#option-3-aws)
  - [Option 4: DigitalOcean](#option-4-digitalocean)
  - [Option 5: Self-Hosted (Linux)](#option-5-self-hosted-linux)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

**Required:**
- Model file (`best_100l.pt`, ~145MB)
- Domain name (recommended for production)
- SSL certificate (Let's Encrypt free option available)

**Recommended:**
- GPU-enabled server for better performance
- Cloud storage (S3, Google Cloud Storage) for model hosting
- Redis for advanced caching
- PostgreSQL for user data (if authentication enabled)

---

## Environment Setup

### 1. Backend Environment Variables

Create `/app/flask-app/.env` from `.env.example`:

```bash
cd app/flask-app
cp .env.example .env
```

**Production configuration:**

```bash
# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-super-secret-key-min-32-chars-random

# Server Configuration
HOST=0.0.0.0
PORT=5000

# CORS - Replace with your frontend domain
CORS_ORIGINS=https://your-frontend-domain.com

# Model Configuration
MODEL_PATH=./models/best_100l.pt
MODEL_DEVICE=auto  # Will use CUDA if available
IMAGE_SIZE=800
CONFIDENCE_THRESHOLD=0.25
IOU_THRESHOLD=0.6

# Cache Configuration
ENABLE_CACHE=True
CACHE_SIZE=100
MAX_IMAGE_SIZE_PX=1920

# Security
REQUIRE_AUTH=False  # Set to True if implementing authentication
JWT_SECRET=another-random-secret-min-32-chars

# Logging
LOG_LEVEL=INFO
LOG_FILE=app.log

# Rate Limiting
RATE_LIMIT=30
```

**Generate secure secrets:**

```bash
# Linux/Mac
openssl rand -hex 32

# Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### 2. Frontend Environment Variables

Create `/app/react-app/.env` from `.env.example`:

```bash
cd app/react-app
cp .env.example .env
```

**Production configuration:**

```bash
# Backend API URL - Replace with your backend domain
VITE_API_URL=https://your-api-domain.com

# App Configuration
VITE_APP_NAME=Pedestrian Attribute Detection
VITE_APP_VERSION=3.0.0

# Feature Flags
VITE_ENABLE_SEARCH_HISTORY=true
VITE_ENABLE_EXPORT=true
VITE_MAX_IMAGE_SIZE_MB=10
VITE_MAX_HISTORY_ITEMS=20
```

### 3. Build Frontend

```bash
cd app/react-app
npm install
npm run build

# Output will be in dist/ folder
ls dist
```

---

## Security Checklist

Before deploying to production, ensure:

- [ ] `FLASK_DEBUG=False` in backend .env
- [ ] Strong `SECRET_KEY` and `JWT_SECRET` (32+ characters)
- [ ] CORS restricted to your frontend domain (not `*`)
- [ ] HTTPS enabled (SSL certificate configured)
- [ ] `.env` files added to `.gitignore`
- [ ] Environment variables set on hosting platform (not hardcoded)
- [ ] Rate limiting enabled
- [ ] File upload validation implemented
- [ ] Model file permissions restricted (read-only)
- [ ] Sensitive data not in logs
- [ ] Database credentials secured (if using database)

---

## Deployment Options

### Option 1: Docker Deployment

**Benefits:** Easy deployment, consistent environments, scalable

#### 1.1 Create Backend Dockerfile

Create `/app/flask-app/Dockerfile`:

```dockerfile
FROM python:3.9-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Create directory for model (mount as volume)
RUN mkdir -p models

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:app"]
```

#### 1.2 Create Frontend Dockerfile

Create `/app/react-app/Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

Create `/app/react-app/nginx.conf`:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

#### 1.3 Create docker-compose.yml

Create in root directory:

```yaml
version: '3.8'

services:
  backend:
    build: ./app/flask-app
    ports:
      - "5000:5000"
    volumes:
      - ./app/flask-app/models:/app/models:ro
      - ./app/flask-app/.env:/app/.env:ro
    environment:
      - FLASK_ENV=production
    restart: unless-stopped

  frontend:
    build: ./app/react-app
    ports:
      - "80:80"
    depends_on:
      - backend
    restart: unless-stopped
```

#### 1.4 Deploy

```bash
# Build and start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

---

### Option 2: Heroku

**Benefits:** Simple deployment, free tier available, automatic HTTPS

#### 2.1 Install Heroku CLI

```bash
# Mac
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

#### 2.2 Deploy Backend

```bash
cd app/flask-app

# Login
heroku login

# Create app
heroku create your-app-name-backend

# Add Python buildpack
heroku buildpacks:set heroku/python

# Set environment variables
heroku config:set FLASK_ENV=production
heroku config:set FLASK_DEBUG=False
heroku config:set SECRET_KEY=$(openssl rand -hex 32)
heroku config:set CORS_ORIGINS=https://your-frontend.herokuapp.com

# Create Procfile
echo "web: gunicorn --bind 0.0.0.0:\$PORT --workers 4 --timeout 120 app:app" > Procfile

# Upload model to Heroku (if < 50MB) or use cloud storage
# For cloud storage, update MODEL_PATH to S3 URL

# Deploy
git init
git add .
git commit -m "Deploy backend"
heroku git:remote -a your-app-name-backend
git push heroku main

# Check logs
heroku logs --tail
```

#### 2.3 Deploy Frontend

```bash
cd app/react-app

# Create app
heroku create your-app-name-frontend

# Add buildpack
heroku buildpacks:set heroku/nodejs

# Set environment variable
heroku config:set VITE_API_URL=https://your-app-name-backend.herokuapp.com

# Create static.json for routing
cat > static.json << EOF
{
  "root": "dist",
  "clean_urls": true,
  "routes": {
    "/**": "index.html"
  }
}
EOF

# Update package.json
# Add to scripts: "heroku-postbuild": "npm run build"

# Deploy
git init
git add .
git commit -m "Deploy frontend"
heroku git:remote -a your-app-name-frontend
git push heroku main
```

**Note:** Heroku's free tier doesn't support persistent file storage. Use cloud storage (S3, Google Cloud Storage) for the model file.

---

### Option 3: AWS

**Benefits:** Scalable, GPU instances available, full control

#### 3.1 AWS Elastic Beanstalk (Easiest)

```bash
# Install EB CLI
pip install awsebcli

# Backend
cd app/flask-app
eb init -p python-3.9 pedestrian-detection-backend
eb create production-backend

# Frontend (use S3 + CloudFront for static hosting)
cd app/react-app
npm run build
aws s3 sync dist/ s3://your-bucket-name
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

#### 3.2 AWS EC2 (Full Control)

1. **Launch EC2 instance:**
   - AMI: Ubuntu 22.04
   - Instance type: `g4dn.xlarge` (GPU) or `t3.medium` (CPU)
   - Security group: Allow ports 22, 80, 443, 5000

2. **Connect and setup:**

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python 3.9
sudo apt install python3.9 python3.9-venv python3-pip -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install Nginx
sudo apt install nginx -y

# For GPU support (optional)
# Install CUDA toolkit
wget https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt update
sudo apt install cuda-toolkit-12-0 -y

# Clone repository
git clone https://github.com/your-username/Attribute-Based-Pedestrian-Detection.git
cd Attribute-Based-Pedestrian-Detection
```

3. **Setup Backend:**

```bash
cd app/flask-app

# Create virtual environment
python3.9 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
nano .env  # Edit with production values

# Download model
# Upload via scp or download from cloud storage
scp -i your-key.pem best_100l.pt ubuntu@your-ec2-ip:~/Attribute-Based-Pedestrian-Detection/app/flask-app/models/

# Test backend
python app.py
```

4. **Setup Frontend:**

```bash
cd ../react-app

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Set VITE_API_URL to your backend URL

# Build
npm run build
```

5. **Configure Nginx:**

```bash
sudo nano /etc/nginx/sites-available/pedestrian-detection

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /home/ubuntu/Attribute-Based-Pedestrian-Detection/app/react-app/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 20M;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/pedestrian-detection /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup Gunicorn service:**

```bash
sudo nano /etc/systemd/system/pedestrian-detection.service

# Add:
[Unit]
Description=Pedestrian Detection Backend
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/Attribute-Based-Pedestrian-Detection/app/flask-app
Environment="PATH=/home/ubuntu/Attribute-Based-Pedestrian-Detection/app/flask-app/venv/bin"
ExecStart=/home/ubuntu/Attribute-Based-Pedestrian-Detection/app/flask-app/venv/bin/gunicorn --bind 127.0.0.1:5000 --workers 4 --timeout 120 app:app
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable pedestrian-detection
sudo systemctl start pedestrian-detection
sudo systemctl status pedestrian-detection
```

7. **Setup SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

### Option 4: DigitalOcean

**Benefits:** Simple, affordable, good documentation

Similar to AWS EC2 setup above. Use DigitalOcean's App Platform for easier deployment:

1. Create Droplet (Ubuntu 22.04)
2. Follow EC2 setup steps
3. Or use App Platform for managed deployment

---

### Option 5: Self-Hosted (Linux Server)

Follow AWS EC2 steps above, but on your own Linux server.

**Additional considerations:**
- Setup firewall (UFW)
- Configure dynamic DNS if needed
- Regular backups
- Monitoring setup

---

## Post-Deployment

### 1. Verify Deployment

```bash
# Test backend health
curl https://your-api-domain.com/

# Test frontend
open https://your-frontend-domain.com

# Test full workflow
# Upload image and verify detection works
```

### 2. Performance Optimization

**Backend:**
- Enable GPU if available (`MODEL_DEVICE=cuda`)
- Increase worker count (`gunicorn --workers 8`)
- Enable caching (`ENABLE_CACHE=True`, `CACHE_SIZE=200`)
- Use Redis for distributed caching

**Frontend:**
- Enable gzip compression in Nginx
- Use CDN for static assets
- Enable browser caching
- Optimize images

### 3. Setup Monitoring

**Application Monitoring:**

```bash
# Install Sentry for error tracking
pip install sentry-sdk[flask]
```

Add to `app.py`:

```python
import sentry_sdk
from sentry_sdk.integrations.flask import FlaskIntegration

sentry_sdk.init(
    dsn=os.getenv('SENTRY_DSN'),
    integrations=[FlaskIntegration()],
    traces_sample_rate=0.1
)
```

**Server Monitoring:**

```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Setup log rotation
sudo nano /etc/logrotate.d/pedestrian-detection

# Add:
/home/ubuntu/Attribute-Based-Pedestrian-Detection/app/flask-app/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
}
```

### 4. Backup Strategy

```bash
# Backup model and environment config daily
crontab -e

# Add:
0 2 * * * tar -czf ~/backups/pedestrian-detection-$(date +\%Y\%m\%d).tar.gz \
  ~/Attribute-Based-Pedestrian-Detection/app/flask-app/.env \
  ~/Attribute-Based-Pedestrian-Detection/app/flask-app/models/*.pt
```

---

## Monitoring

### Key Metrics to Monitor

1. **Performance:**
   - Response time (< 5s for 95th percentile)
   - Requests per second
   - CPU usage (< 80% sustained)
   - Memory usage (< 80%)
   - GPU utilization (if applicable)

2. **Errors:**
   - HTTP error rate (< 1%)
   - Application exceptions
   - Failed file uploads

3. **Business:**
   - Total detections per day
   - Average detection time
   - Most used attributes
   - Cache hit rate

### Monitoring Tools

- **Free:** Prometheus + Grafana, Netdata
- **Paid:** DataDog, New Relic, AWS CloudWatch

---

## Troubleshooting

### Backend Issues

**Problem:** `Model file not found`
```bash
# Verify model exists
ls -lh app/flask-app/models/best_100l.pt

# Check permissions
chmod 644 app/flask-app/models/best_100l.pt

# Check .env MODEL_PATH
cat app/flask-app/.env | grep MODEL_PATH
```

**Problem:** `CUDA out of memory`
```bash
# Reduce IMAGE_SIZE in .env
IMAGE_SIZE=640

# Reduce worker count
gunicorn --workers 2 ...

# Disable GPU
MODEL_DEVICE=cpu
```

**Problem:** `Slow processing`
```bash
# Enable caching
ENABLE_CACHE=True

# Enable GPU
MODEL_DEVICE=cuda

# Reduce image size
MAX_IMAGE_SIZE_PX=1280
```

### Frontend Issues

**Problem:** `Cannot connect to backend`
```bash
# Check VITE_API_URL in .env
cat app/react-app/.env

# Verify CORS settings in backend
# CORS_ORIGINS should include frontend domain

# Check network connectivity
curl https://your-api-domain.com/
```

**Problem:** `Build fails`
```bash
# Clear cache
rm -rf node_modules dist
npm install
npm run build
```

### Deployment Issues

**Problem:** `502 Bad Gateway`
```bash
# Check if backend is running
sudo systemctl status pedestrian-detection

# Check backend logs
journalctl -u pedestrian-detection -n 50

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

**Problem:** `Permission denied`
```bash
# Fix file permissions
sudo chown -R ubuntu:ubuntu ~/Attribute-Based-Pedestrian-Detection

# Fix model permissions
chmod 644 app/flask-app/models/*.pt
```

---

## Scaling

### Horizontal Scaling

**Load Balancer Setup (Nginx):**

```nginx
upstream backend {
    server backend1.example.com:5000;
    server backend2.example.com:5000;
    server backend3.example.com:5000;
}

server {
    location /api/ {
        proxy_pass http://backend/;
    }
}
```

### Vertical Scaling

- Upgrade to GPU instance (AWS g4dn, p3 instances)
- Increase memory for larger cache
- Use SSD for faster model loading

---

## Cost Estimation

### AWS (Monthly)

- **Small (CPU):** ~$50-100 (t3.medium + S3)
- **Medium (GPU):** ~$300-500 (g4dn.xlarge + S3)
- **Large (Multi-GPU):** ~$1000+ (p3.2xlarge)

### Heroku (Monthly)

- **Hobby:** $7/month (limited, no GPU)
- **Professional:** $250/month

### DigitalOcean (Monthly)

- **Basic:** $12-24/month (CPU droplet)
- **GPU:** Contact for pricing

### Self-Hosted

- Hardware costs + electricity + internet
- ~$200-500 initial, ~$20-50/month ongoing

---

## Security Best Practices

1. **Never commit secrets:**
   - Use `.env` files
   - Add `.env` to `.gitignore`
   - Use environment variables on hosting platforms

2. **HTTPS everywhere:**
   - Use Let's Encrypt for free SSL
   - Redirect HTTP to HTTPS
   - Enable HSTS headers

3. **Input validation:**
   - Validate file types and sizes
   - Sanitize user inputs
   - Limit request sizes

4. **Rate limiting:**
   - Prevent DoS attacks
   - Use Flask-Limiter or Nginx limit_req

5. **Regular updates:**
   - Keep dependencies updated
   - Monitor security advisories
   - Apply patches promptly

6. **Access control:**
   - Restrict model file access
   - Use firewalls
   - Implement authentication if needed

---

## Support

For issues or questions:

1. Check [Troubleshooting](#troubleshooting) section
2. Review application logs
3. Open GitHub issue
4. Contact maintainer

---

**Last Updated:** 2025-11-18
**Version:** 3.0
**Deployment Status:** Production Ready ✅
