# Backend Deployment Guide

This document outlines how to deploy the Dr. Bushra Mirzah Blog backend application to **Render** (primary) and other platforms.

## Prerequisites

- **Primary (Render)**: GitHub account connected to Render
- **PostgreSQL database** (via Supabase)
- **Redis instance** (automatically provisioned by Render)
- **Alternative**: Node.js 18+ and Docker for local/containerized deployment

## Render Deployment (Recommended)

### Step 1: Connect Repository
1. Connect your GitHub repository to Render
2. The `render.yaml` file will automatically configure your services

### Step 2: Environment Variables
In Render dashboard, set these environment variables:

```
# Supabase - Get from your Supabase project settings
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Admin credentials - Change these before deploying!
ADMIN_USERNAME=DrBushraMirza
ADMIN_PASSWORD=your_secure_password
ADMIN_EMAIL=admin@example.com
```

**Note**: `COOKIE_SECRET`, `REDIS_URI`, and `PORT` are automatically provided by Render.

### Step 3: Deploy
Render will automatically:
- Build your application using the commands in `render.yaml`
- Provision Redis instance
- Set up networking between services
- Generate health check URL

### Step 4: Post-Deployment
1. **Update Redis URI**: After deployment, note the Redis internal URL from Render and update your environment if needed
2. **Run Migrations**: Execute database migrations manually or through Render's shell
3. **Verify Health**: Check the `/health` endpoint to ensure the service is running

## Render Configuration Details

The `render.yaml` file defines:
- **Web Service**: Node.js application with build and start commands
- **Redis Service**: Managed Redis instance with private networking
- **Environment Variables**: With secure defaults and auto-generated secrets
- **Health Checks**: Automatic monitoring via `/health` endpoint

### Environment Variable Notes:
- `COOKIE_SECRET`: Auto-generated secure random string
- `REDIS_URI`: Internal Redis connection string (auto-configured)
- `PORT`: Dynamically assigned by Render (handled in code)

## Environment Variables (Alternative/Local Development)

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace_with_service_role_key
SUPABASE_ANON_KEY=replace_with_anon_key

# Redis
REDIS_URI=redis://127.0.0.1:6379

# JWT / Cookies
COOKIE_SECRET=replace_with_a_long_random_secret
COOKIE_NAME=admin_token

# Admin seed credentials (change before deploying)
ADMIN_USERNAME=DrBushraMirza
ADMIN_PASSWORD=change_this_password
ADMIN_EMAIL=admin@example.com

# App
PORT=8080
NODE_ENV=production
```

## Building and Running

### Development

```bash
npm install
npm run dev  # Runs with hot reload
```

### Production

```bash
npm run build  # Compile TypeScript
npm start      # Start production server
```

Or use the convenience script:

```bash
npm run prod  # Build and start
```

## Docker Deployment

### Single Container

```bash
# Build Docker image
npm run docker:build

# Run container
npm run docker:run
```

### Multi-Container (with Redis)

```bash
# Start services
npm run docker:up

# Stop services
npm run docker:down
```

## Docker Compose Setup

The `docker-compose.yml` includes:
- Backend application (Node.js/TypeScript)
- Redis cache instance
- Networking between services
- Volume persistence for Redis data

## Health Checks

The application includes health check endpoints:

- `/health` - Application health status
- Container health checks via `healthcheck.js`

## Database Migrations

Run database migrations before deployment:

```bash
node run_migration.js
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Supabase project set up
- [ ] Redis instance running
- [ ] Database migrations applied
- [ ] Admin user seeded (if needed)
- [ ] CORS configured for frontend domains
- [ ] SSL certificates configured (if applicable)
- [ ] Monitoring/logging set up
- [ ] Backup strategy implemented

## Security Considerations

- Change default admin credentials
- Use strong cookie secrets
- Configure CORS for specific domains in production
- Keep dependencies updated
- Use environment-specific configurations
- Implement rate limiting if needed

## Monitoring

The application provides:
- Health check endpoint for load balancers
- Basic uptime and timestamp information
- Container health monitoring

## Troubleshooting

Common issues:
1. **Port conflicts**: Ensure port 8080 is available
2. **Redis connection**: Verify Redis is running and accessible
3. **Supabase connection**: Check API keys and network connectivity
4. **Build errors**: Ensure all dependencies are installed and compatible

## Support

For deployment issues, check:
- Docker logs: `docker-compose logs app`
- Application logs in container stdout
- Health endpoint status
