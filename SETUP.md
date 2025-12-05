# WRAITHNET Setup Guide

## Prerequisites

1. **Node.js 20+** - [Download](https://nodejs.org/)
2. **Docker & Docker Compose** - [Download](https://www.docker.com/products/docker-desktop/)
3. **npm or yarn**

## Step-by-Step Setup

### 1. Install Root Dependencies

```bash
npm install
```

### 2. Start Infrastructure Services

Start PostgreSQL, Redis, Chroma, and MinIO:

```bash
docker-compose up -d
```

Verify services are running:

```bash
docker-compose ps
```

You should see all services as "Up" and healthy.

### 3. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# Seed the database with sample data
npm run db:seed
```

### 4. Frontend Setup (Coming Soon)

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

### 5. Start Development

From the root directory:

```bash
# Start both backend and frontend
npm run dev

# Or start them separately:
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```

## Accessing Services

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Backend Health**: http://localhost:3000/health
- **MinIO Console**: http://localhost:9001 (user: wraithnet, pass: wraithnet_dev_password)
- **Prisma Studio**: `cd backend && npm run db:studio`

## Database Management

### View Database

```bash
cd backend
npm run db:studio
```

This opens Prisma Studio in your browser to view and edit data.

### Reset Database

```bash
cd backend
npm run db:reset
```

This will drop all data, re-run migrations, and re-seed.

### Create New Migration

After modifying `prisma/schema.prisma`:

```bash
cd backend
npm run db:migrate
```

## Troubleshooting

### Docker Permission Issues

If you get permission errors with Docker:

```bash
# Linux/Mac
sudo usermod -aG docker $USER
newgrp docker

# Then restart Docker
```

### Port Already in Use

If ports 3000, 5173, 5432, 6379, 8000, 9000, or 9001 are in use:

1. Stop the conflicting service
2. Or modify the ports in `docker-compose.yml` and `.env` files

### Database Connection Issues

1. Ensure Docker containers are running: `docker-compose ps`
2. Check DATABASE_URL in `backend/.env` matches docker-compose.yml
3. Try restarting containers: `docker-compose restart`

### Prisma Issues

```bash
cd backend

# Regenerate Prisma client
npm run db:generate

# Reset and resync database
npm run db:push
```

## Environment Variables

### Backend (.env)

```env
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://wraithnet:wraithnet_dev_password@localhost:5432/wraithnet

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# AI Services
OPENAI_API_KEY=your-openai-api-key

# File Storage
S3_BUCKET=wraithnet-graveyard
S3_REGION=us-east-1
S3_ACCESS_KEY=wraithnet
S3_SECRET_KEY=wraithnet_dev_password
S3_ENDPOINT=http://localhost:9000

# Vector DB
VECTOR_DB_URL=http://localhost:8000
```

## Next Steps

1. Explore the API at http://localhost:3000/health
2. View the database in Prisma Studio
3. Check out the sample data created by the seed script
4. Start implementing features from the tasks.md file

---

*The spirits await your commands...*
