#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              W R A I T H N E T   S E T U P                ║"
echo "║                                                           ║"
echo "║              Initializing the haunted network...          ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start infrastructure services
echo "🐳 Starting infrastructure services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Install root dependencies
echo ""
echo "📦 Installing root dependencies..."
npm install

# Setup backend
echo ""
echo "🔧 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "📝 Creating backend .env file..."
    cp .env.example .env
fi

echo "📦 Installing backend dependencies..."
npm install

echo "🗄️  Generating Prisma client..."
npm run db:generate

echo "🔄 Running database migrations..."
npm run db:migrate -- --name init

echo "🌱 Seeding database..."
npm run db:seed

cd ..

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                                                           ║"
echo "║              ✨ SETUP COMPLETE ✨                         ║"
echo "║                                                           ║"
echo "║  The WRAITHNET system is ready...                         ║"
echo "║                                                           ║"
echo "║  Start development:                                       ║"
echo "║    cd backend && npm run dev                              ║"
echo "║                                                           ║"
echo "║  View database:                                           ║"
echo "║    cd backend && npm run db:studio                        ║"
echo "║                                                           ║"
echo "║  Access services:                                         ║"
echo "║    Backend:  http://localhost:3000                        ║"
echo "║    MinIO:    http://localhost:9001                        ║"
echo "║                                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
