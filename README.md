<div align="center">

# 👻 WRAITHNET

### *A Haunted AI-Powered BBS System*

> Where the digital dead gather to whisper their secrets...

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              W R A I T H N E T   S Y S T E M              ║
║                                                           ║
║              The dead network awakens...                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

**Resurrect the spirit of 1980s/1990s Bulletin Board Systems with modern AI, dynamic horror elements, and cinematic storytelling.**

[Features](#-features) • [Getting Started](#-getting-started) • [Commands](#-available-commands) • [Contributing](#contributing)

</div>

---

## 📖 Table of Contents

- [About](#about)
- [Demo](#-demo)
- [Features](#-features)
- [Available Commands](#-available-commands)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Docker Services](#-docker-services)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Testing](#running-tests)
- [Troubleshooting](#troubleshooting)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## 🎬 Demo

<div align="center">

### Terminal Interface

```
WRAITHNET v1.0.0 - The Dead Network Awakens
═══════════════════════════════════════════════════════════

> login ghost_user
✓ The spirits recognize you. Welcome back...

> board
📋 WRAITHNET MESSAGE BOARD
═══════════════════════════════════════════════════════════
[a1b2c3d4] Welcome to WRAITHNET          by admin        2 replies
[e5f6g7h8] Strange occurrences           by user123      5 replies
[i9j0k1l2] Technical discussions         by dev_ghost    1 reply

> read a1b2c3d4
[Reading thread: Welcome to WRAITHNET]
...

> help
Available commands:
  register, login, logout, board, read, post, reply, 
  delete-reply, posted, replied, help, clear
```

*Screenshots and video demo coming soon...*

</div>

## About

WRAITHNET is an immersive retro terminal-based digital experience that fuses the nostalgic charm of 1980s/1990s Bulletin Board Systems with cutting-edge AI technology and atmospheric horror elements. Users enter a haunted command-driven world where the digital and the supernatural intertwine, creating an experience that is part computer system, part supernatural entity.

The entire system functions as a possessed, resurrected network filled with ghostly presences, cryptic messages, evolving AI personas, interactive horror simulations, and ritual-based digital features.

### Why WRAITHNET?

- 🎮 **Nostalgic Yet Modern:** Experience the charm of classic BBS systems with modern web technologies
- 🤖 **AI-Powered Horror:** Dynamic ghost personalities that respond to your actions in real-time
- 👻 **Living Ghost Engine:** Four distinct ghost modes (Whisperer, Poltergeist, Trickster, Demon) that react to keywords, silence, and sentiment
- 🎨 **Atmospheric Immersion:** Real-time chat with supernatural interventions
- 🔮 **Unpredictable Gameplay:** Ghost behavior adapts based on conversation patterns and triggers
- 💻 **Authentic Terminal:** Real command-line interface powered by xterm.js
- 🌐 **Full-Stack Experience:** Learn modern web development through a unique project

## ✨ Features

### 🟢 Currently Available

#### Authentication & User Management
- ✅ **User Registration & Login** - Secure account creation with encrypted password storage
- ✅ **Session Management** - Persistent sessions with JWT authentication
- ✅ **User Profiles** - Maintain your digital presence in the haunted network

#### Message Board (Echoes of the Lost)
- ✅ **Threaded Discussions** - Create and participate in forum-style conversations
- ✅ **Thread Management** - View, create, and reply to threads
- ✅ **Reply History** - Track all threads you've participated in
- ✅ **Reply Deletion** - Remove your messages from the void
- ✅ **Chronological Ordering** - Messages displayed in proper temporal sequence
- ✅ **Partial ID Support** - Use shortened IDs for quick command access

#### Terminal Interface
- ✅ **Authentic Terminal Emulator** - Powered by xterm.js with retro aesthetics
- ✅ **Command Parser** - Intuitive command-line interface with suggestions
- ✅ **Retro Styling** - Monospace fonts, purple/green color schemes, CRT effects
- ✅ **Command History** - Navigate through previous commands
- ✅ **Help System** - Comprehensive command documentation

#### WebSocket Infrastructure
- ✅ **Real-Time Communication** - Socket.io powered bidirectional messaging
- ✅ **JWT Authentication** - Secure WebSocket connections
- ✅ **Presence Tracking** - Monitor online users with heartbeat mechanism
- ✅ **Room Management** - Join/leave chat rooms dynamically
- ✅ **Connection Resilience** - Automatic reconnection handling

#### Real-Time Chat (Whisper Room)
- ✅ **Live Ghost Chatroom** - Real-time WebSocket-powered conversations
- ✅ **Ghost Interventions** - AI entities that join and influence discussions
- ✅ **User Presence** - See who else is connected to the network
- ✅ **Chat History** - Recent message persistence (last 50 messages)
- 🔜 **Private Whispers** - Direct messages with distinct supernatural styling

#### Dynamic Ghost AI System
- ✅ **Shapeshifting Personalities** - Four distinct ghost modes:
  - **Whisperer** - Subtle, cryptic, mysterious messages
  - **Poltergeist** - Aggressive, chaotic, disruptive behavior
  - **Trickster** - Playful, misleading, puzzle-like interactions
  - **Demon** - Threatening, intense, overwhelming presence
- ✅ **Trigger System** - Ghost behavior responds to:
  - Keyword detection in conversations
  - Silence thresholds (60 seconds)
  - Sentiment analysis
  - Dynamic mode transitions
- ✅ **Ghost Message Injection** - Supernatural entities appear in chat with distinct styling
- ✅ **State Persistence** - Ghost state maintained in Redis with intervention history
- 🔜 **Thread Corruption** - Text corruption effects on existing messages

### 🟡 Coming Soon

#### Séance Lab (AI Necromancer)
- 🔜 **Personal Ghost Creation** - Upload text to summon custom AI personas
- 🔜 **Style-Matched Responses** - Ghosts learn from uploaded content
- 🔜 **Conversation Memory** - Vector database stores persona embeddings
- 🔜 **Persona Evolution** - Ghosts grow and change with new uploads
- 🔜 **System Ghost Intrusions** - Global lore messages during séances

#### File Graveyard (Digital Cemetery)
- 🔜 **File Burial** - Store files in the digital graveyard
- 🔜 **AI-Generated Epitaphs** - Contextual inscriptions for buried files
- 🔜 **File Resurrection** - Retrieve buried files with potential corruption
- 🔜 **Corruption Mechanics** - Random outcomes:
  - 40% intact return
  - 30% light corruption
  - 20% heavy corruption
  - 10% complete transformation
- 🔜 **Personal & Communal Graveyards** - Private and public burial grounds
- 🔜 **Grave Inspection** - View epitaphs and ghost comments

#### Haunted Mailbox
- 🔜 **Private Messages** - Receive system-generated communications
- 🔜 **Message Types**:
  - Séance transcripts
  - Ghost warnings
  - System alerts
  - Lore fragments
  - Puzzle pieces
- 🔜 **Unread Notifications** - Real-time alerts for new messages
- 🔜 **Message Management** - Read, archive, and delete messages

#### Sysop Room (Forbidden Control Chamber)
- 🔜 **Puzzle-Based Unlock** - Solve mysteries to gain access
- 🔜 **Corrupted System Logs** - Discover hidden system information
- 🔜 **Hidden Thread Revelation** - Access previously locked message board content
- 🔜 **Dangerous Commands** - Execute forbidden system operations
- 🔜 **Unstable Atmosphere** - Enhanced visual and text effects

#### Door Games (Interactive Horror)
- 🔜 **Branching Narratives** - Choice-driven horror stories
- 🔜 **ASCII Art Integration** - Visual storytelling elements
- 🔜 **Ghost Takeovers** - AI interruptions during gameplay
- 🔜 **Progress Persistence** - Save and resume game sessions
- 🔜 **Planned Games**:
  - Abandoned Hospital
  - EVP Static Room
  - Ouija Terminal
  - Catacombs Maze
  - The Last Transmission (locked finale)

#### Visual & Audio Effects
- 🔜 **Screen Corruption** - Glitch effects, flicker, static overlay
- 🔜 **Text Corruption** - Character substitution, zalgo text, symbol insertion
- 🔜 **Color Shifts** - Dynamic palette changes
- 🔜 **Scanline Artifacts** - CRT-style visual distortion
- 🔜 **Atmospheric Audio** - Ambient sounds synchronized with ghost events:
  - Whispers
  - Static bursts
  - Keyboard typing
  - Door creaks
  - Heartbeat
  - Ambient drones

## 👻 The Ghost Engine

WRAITHNET features a sophisticated AI-powered Ghost Engine that creates dynamic, unpredictable horror experiences. The ghost is not just a chatbot—it's a living entity that observes, reacts, and evolves based on user interactions.

### Ghost Personality Modes

The ghost can manifest in four distinct modes, each with unique characteristics:

#### 🌫️ Whisperer Mode
- **Tone:** Subtle, cryptic, mysterious
- **Behavior:** Offers enigmatic hints and observations
- **Triggers:** Help-seeking keywords, positive sentiment
- **Intensity:** Low (10-40%)
- **Example:** *"I sense... something in the shadows..."*

#### ⚡ Poltergeist Mode
- **Tone:** Aggressive, chaotic, disruptive
- **Behavior:** Fragmented messages, urgent warnings
- **Triggers:** Anger keywords, negative sentiment
- **Intensity:** High (50-80%)
- **Example:** *"*CRASH* Did you hear that?!"*

#### 🎭 Trickster Mode
- **Tone:** Playful, misleading, puzzle-like
- **Behavior:** Riddles, wordplay, misdirection
- **Triggers:** Game/fun keywords, moderate positive sentiment
- **Intensity:** Moderate (30-60%)
- **Example:** *"Hehe... want to play a game?"*

#### 😈 Demon Mode
- **Tone:** Threatening, intense, overwhelming
- **Behavior:** Dark prophecies, direct threats
- **Triggers:** Death/fear keywords, very negative sentiment
- **Intensity:** Maximum (70-100%)
- **Example:** *"Your soul... it calls to me..."*

### Trigger System

The Ghost Engine continuously monitors chat activity and responds to various triggers:

**Keyword Triggers (Priority: High)**
- Detects specific words that invoke mode transitions
- Examples: "help" → Whisperer, "angry" → Poltergeist, "trick" → Trickster, "death" → Demon

**Silence Triggers (Priority: Medium)**
- Activates after 60 seconds of chat inactivity
- Randomly selects a mode for intervention
- Creates atmospheric tension during quiet moments

**Sentiment Analysis (Priority: Medium)**
- Analyzes emotional tone of messages
- Very negative → Demon, Negative → Poltergeist
- Positive → Trickster, Very positive → Whisperer

**State Persistence**
- Ghost state stored in Redis with full history
- Tracks current mode, intensity level, and intervention timestamps
- Maintains trigger history for narrative coherence

### How It Works

1. **User sends a message** in the Whisper Room
2. **Trigger evaluation** analyzes keywords, sentiment, and timing
3. **Mode transition** occurs if triggers are detected
4. **Ghost response** is generated after a random delay (2-7 seconds)
5. **Message injection** broadcasts the ghost's message to all users
6. **State update** persists the new ghost state to Redis

The ghost appears as a distinct entity in chat with special styling, making its supernatural presence unmistakable.

## 🎮 Available Commands

<details>
<summary><b>📋 Quick Reference Card</b></summary>

```
╔═══════════════════════════════════════════════════════════╗
║                  WRAITHNET COMMAND GUIDE                  ║
╠═══════════════════════════════════════════════════════════╣
║ GENERAL                                                   ║
║  help                    Show all commands                ║
║  clear                   Clear terminal screen            ║
║                                                           ║
║ AUTHENTICATION                                            ║
║  register <user> <email> <pass>  Create account          ║
║  login <user> <pass>              Sign in                ║
║  logout                           Sign out               ║
║                                                           ║
║ MESSAGE BOARD                                             ║
║  board                   List all threads                 ║
║  posted                  Your created threads             ║
║  replied                 Threads you replied to           ║
║  read <id>               Read specific thread             ║
║  post "<title>" "<text>" Create new thread               ║
║  reply <id> "<text>"     Reply to thread                 ║
║  delete-reply <msg_id>   Delete your reply               ║
║                                                           ║
║ COMING SOON                                               ║
║  chat                    Enter Whisper Room               ║
║  seance                  Summon personal ghost            ║
║  graveyard               Visit File Graveyard             ║
║  mail                    Check mailbox                    ║
║  games                   Browse Door Games                ║
║  sysop                   Access control chamber           ║
╚═══════════════════════════════════════════════════════════╝
```

</details>

### General Commands
- `help` - Display available commands with descriptions
- `clear` - Clear the terminal screen

### Authentication Commands
- `register <username> <email> <password>` - Create a new account
  - Example: `register ghost_user ghost@example.com mypassword123`
- `login <username> <password>` - Log into your account
  - Example: `login ghost_user mypassword123`
- `logout` - Log out of your current session

### Message Board Commands
- `board` - View all message board threads with metadata
- `posted` - View threads you've created
- `replied` - View threads you've replied to (includes message IDs)
- `read <thread_id>` - Read a specific thread with all messages
  - Example: `read a1b2c3d4` (supports partial IDs)
- `post "<title>" "<content>"` - Create a new thread
  - Example: `post "Hello WRAITHNET" "My first post!"`
- `reply <thread_id> "<content>"` - Reply to an existing thread
  - Example: `reply a1b2c3d4 "Great post!"`
- `delete-reply <message_id>` - Delete one of your replies
  - Example: `delete-reply m5n6o7p8`

### Coming Soon Commands
- `chat` - Enter the Whisper Room (real-time ghost chatroom)
- `seance` - Enter the Séance Lab (create personal ghost)
- `graveyard` - Visit the File Graveyard (bury and resurrect files)
- `mail` - Check your Haunted Mailbox (private messages)
- `games` - Browse Door Games (interactive horror stories)
- `sysop` - Access Sysop Room (forbidden control chamber, requires unlock)

## 🛠 Tech Stack

### Frontend
- **React 18** - Modern UI framework with TypeScript
- **xterm.js** - Full-featured terminal emulator
- **Socket.io Client** - Real-time WebSocket communication
- **TailwindCSS** - Utility-first styling
- **Vite** - Fast build tool and dev server
- **Howler.js** - Audio library (planned)
- **Canvas/WebGL** - Visual effects engine (planned)

### Backend
- **Node.js 20+** - JavaScript runtime
- **Express.js** - Web framework for REST API
- **TypeScript** - Type-safe development
- **Socket.io** - WebSocket server (planned)
- **Prisma** - Database ORM
- **PostgreSQL 15+** - Primary relational database
- **Redis 7+** - In-memory cache and sessions
- **bcrypt** - Password hashing
- **JWT** - Token-based authentication

### Infrastructure (Planned)
- **Chroma** - Vector database for AI embeddings
- **MinIO** - S3-compatible object storage
- **OpenAI API** - GPT-4 for ghost text generation
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+** - JavaScript runtime
- **Docker & Docker Compose** - For infrastructure services
- **npm** - Package manager
- **PostgreSQL** - Database (via Docker)
- **Redis** - Cache and sessions (via Docker)

### Quick Start

1. **Clone the repository:**
```bash
git clone <repository-url>
cd WRAITHNET
```

2. **Start infrastructure services:**
```bash
docker-compose up -d
```
This starts PostgreSQL and Redis in Docker containers.

3. **Set up the backend:**
```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Backend server port (default: 3000)

4. **Run database migrations:**
```bash
npx prisma migrate dev
npx prisma generate
```

5. **Start the backend server:**
```bash
npm run dev
```
Backend will be available at `http://localhost:3000`

6. **Set up the frontend (in a new terminal):**
```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env` and configure:
- `VITE_API_URL` - Backend API URL (default: http://localhost:3000)

7. **Start the frontend:**
```bash
npm run dev
```

8. **Open your browser:**
Navigate to `http://localhost:5173` and start exploring WRAITHNET!

### First Steps

1. Register a new account: `register <username> <email> <password>`
2. Login: `login <username> <password>`
3. View the message board: `board`
4. Create your first thread: `post "Hello WRAITHNET" "My first post!"`
5. Type `help` to see all available commands

## 🐳 Docker Services

The `docker-compose.yml` provides the following infrastructure services:

### Currently Active
- **PostgreSQL** (port 5432) - Primary relational database for users, threads, messages
- **Redis** (port 6379) - In-memory store for sessions and caching

### Planned Services
- **Chroma** (port 8000) - Vector database for AI embeddings and semantic search
- **MinIO** (ports 9000, 9001) - S3-compatible object storage for file graveyard

To start services:
```bash
docker-compose up -d          # Start all services
docker-compose ps             # Check service status
docker-compose logs -f        # View logs
docker-compose down           # Stop all services
```

## Project Structure

```
WRAITHNET/
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── config/      # Configuration files
│   │   ├── middleware/  # Express middleware
│   │   ├── routes/      # API routes
│   │   ├── services/    # Business logic
│   │   └── models/      # Database models
│   └── package.json
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom hooks
│   │   └── utils/       # Utilities
│   └── package.json
├── docker-compose.yml   # Infrastructure services
└── README.md
```

## Development

### Backend Scripts
```bash
cd backend
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript to JavaScript
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate test coverage report
npx prisma migrate dev   # Create and apply database migrations
npx prisma studio        # Open Prisma Studio (database GUI)
npx prisma db seed       # Seed database with sample data
```

### Frontend Scripts
```bash
cd frontend
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Build for production
npm run preview          # Preview production build locally
npm run lint             # Run ESLint
```

### Running Tests

WRAITHNET uses both unit tests and property-based tests to ensure correctness:

**Backend Tests:**
```bash
cd backend
npm test                           # Run all tests
npm run test:watch                 # Watch mode for development
npm run test:coverage              # Generate coverage report
npm test -- boardRoutes.test.ts    # Run specific test file
```

**Property-Based Tests:**
The project includes comprehensive property-based tests that verify universal properties across many random inputs:
- Authentication properties (password hashing, session management)
- Message board properties (thread ordering, reply handling)
- Data persistence properties (round-trip consistency)

**Frontend Tests:**
```bash
cd frontend
npm test                 # Run component tests
npm run test:e2e         # Run end-to-end tests (coming soon)
```

## Environment Variables

### Backend Configuration (`.env`)

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/wraithnet"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# JWT Authentication
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3000
NODE_ENV=development

# CORS Configuration
FRONTEND_URL="http://localhost:5173"

# AI Configuration (Coming Soon)
OPENAI_API_KEY="your-openai-api-key"

# File Storage (Coming Soon)
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="wraithnet-graveyard"

# Vector Database (Coming Soon)
CHROMA_URL="http://localhost:8000"
```

### Frontend Configuration (`.env`)

Create a `.env` file in the `frontend/` directory:

```env
# Backend API URL
VITE_API_URL=http://localhost:3000

# WebSocket URL (Coming Soon)
VITE_WS_URL=ws://localhost:3000
```

## Database Management

### Migrations

WRAITHNET uses Prisma for database management:

```bash
cd backend

# Create a new migration after schema changes
npx prisma migrate dev --name description_of_changes

# Apply migrations to production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### Database Schema

The current schema includes:

**Users Table:**
- User authentication and profile information
- Tracks creation date and last login

**Threads Table:**
- Forum discussion threads
- Includes title, author, timestamps
- Supports hidden threads for narrative progression

**Messages Table:**
- Individual posts within threads
- Chronologically ordered
- Supports ghost-authored messages

**Future Tables:**
- Graves (File Graveyard)
- MailMessages (Haunted Mailbox)
- GameSessions (Door Games progress)
- SysopAccess (Forbidden room unlocks)

## API Documentation

### Authentication Endpoints

```
POST /api/auth/register
Body: { username, email, password }
Response: { user, token }

POST /api/auth/login
Body: { username, password }
Response: { user, token }

POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { message }

GET /api/auth/session
Headers: Authorization: Bearer <token>
Response: { user }
```

### Message Board Endpoints

```
GET /api/boards/threads
Query: ?page=1&limit=20
Response: { threads: [...], total, page, pages }

GET /api/boards/threads/:id
Response: { thread, messages: [...] }

POST /api/boards/threads
Headers: Authorization: Bearer <token>
Body: { title, content }
Response: { thread }

POST /api/boards/threads/:id/messages
Headers: Authorization: Bearer <token>
Body: { content }
Response: { message }

GET /api/boards/replies
Headers: Authorization: Bearer <token>
Response: { threads: [...] }

DELETE /api/boards/messages/:messageId
Headers: Authorization: Bearer <token>
Response: { message }
```

### Coming Soon: Additional Endpoints
- `/api/chat/*` - Real-time chat endpoints
- `/api/seance/*` - Personal ghost creation
- `/api/graveyard/*` - File burial and resurrection
- `/api/mailbox/*` - Private messages
- `/api/games/*` - Door games
- `/api/sysop/*` - Forbidden control chamber

## Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Ensure PostgreSQL is running
docker-compose ps

# Check database logs
docker-compose logs postgres

# Verify DATABASE_URL in backend/.env
```

**Redis Connection Errors:**
```bash
# Ensure Redis is running
docker-compose ps

# Check Redis logs
docker-compose logs redis

# Verify REDIS_URL in backend/.env
```

**Port Already in Use:**
```bash
# Find process using port 3000 (backend)
lsof -i :3000
kill -9 <PID>

# Find process using port 5173 (frontend)
lsof -i :5173
kill -9 <PID>
```

**Migration Errors:**
```bash
# Reset database and reapply migrations
cd backend
npx prisma migrate reset
npx prisma migrate dev
```

**Frontend Not Connecting to Backend:**
- Verify `VITE_API_URL` in `frontend/.env` matches backend URL
- Check CORS configuration in backend
- Ensure backend server is running

### Debug Mode

Enable detailed logging:

**Backend:**
```env
# In backend/.env
NODE_ENV=development
LOG_LEVEL=debug
```

**Frontend:**
```javascript
// In browser console
localStorage.setItem('debug', 'wraithnet:*')
```

## Performance Considerations

### Current Optimizations
- JWT-based stateless authentication
- Redis caching for sessions
- Database indexing on frequently queried fields
- Pagination for thread listings

### Planned Optimizations
- WebSocket connection pooling
- AI response caching
- CDN for static assets
- Database query optimization
- Rate limiting for API endpoints

## Security Features

### Implemented
- ✅ Bcrypt password hashing with salt rounds
- ✅ JWT token-based authentication
- ✅ CORS protection
- ✅ Input validation and sanitization
- ✅ SQL injection prevention (Prisma ORM)
- ✅ Secure session management

### Planned
- 🔜 Rate limiting
- 🔜 File upload validation and scanning
- 🔜 Content Security Policy (CSP)
- 🔜 HTTPS enforcement
- 🔜 XSS protection
- 🔜 CSRF tokens

## Roadmap

### Phase 1: Core BBS (✅ Complete)
- ✅ User authentication
- ✅ Message board with threads and replies
- ✅ Terminal interface with command parsing
- ✅ Basic retro aesthetics

### Phase 2: Real-Time Features (✅ Complete)
- ✅ WebSocket infrastructure
- ✅ Whisper Room (live chat)
- ✅ User presence tracking
- ✅ Real-time notifications

### Phase 3: AI Ghost System (✅ Complete)
- ✅ Ghost personality engine with 4 distinct modes
- ✅ Dynamic mode transitions based on triggers
- ✅ Trigger system (keywords, silence, sentiment)
- ✅ Ghost message generation and injection
- ✅ State persistence in Redis
- 🔜 Visual and audio effects
- 🔜 AI-powered message generation (OpenAI integration)

### Phase 4: Advanced Features (📋 Planned)
- 🔜 Séance Lab (personal ghost creation)
- 🔜 File Graveyard (burial and resurrection)
- 🔜 Haunted Mailbox (private messages)
- 🔜 Door Games (interactive horror)
- 🔜 Sysop Room (forbidden access)

### Phase 5: Polish & Launch (📋 Planned)
- 🔜 Mobile responsiveness
- 🔜 Performance optimization
- 🔜 Comprehensive testing
- 🔜 Documentation
- 🔜 Deployment automation

## Contributing

While WRAITHNET is primarily a personal project, contributions are welcome!

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch:** `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Write tests** for new functionality
5. **Ensure all tests pass:** `npm test`
6. **Commit your changes:** `git commit -m 'Add amazing feature'`
7. **Push to your fork:** `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Contribution Guidelines

- Follow the existing code style (Prettier + ESLint)
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Keep PRs focused on a single feature/fix

### Areas for Contribution

- 🐛 Bug fixes
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🧪 Additional test coverage
- 🎮 New Door Game narratives
- 🎵 Sound effect contributions
- 🌐 Internationalization

## Testing Philosophy

WRAITHNET uses a dual testing approach:

**Unit Tests:** Verify specific examples and edge cases
- Test individual functions and components
- Validate error handling
- Check integration points

**Property-Based Tests:** Verify universal properties
- Test behavior across many random inputs
- Catch edge cases that unit tests might miss
- Ensure correctness at scale

Together, these approaches provide comprehensive coverage and confidence in the codebase.

## License

MIT License

Copyright (c) 2024 WRAITHNET

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Acknowledgments

- **Inspiration:** Classic BBS systems of the 1980s and 1990s
- **Terminal Emulation:** [xterm.js](https://xtermjs.org/) for authentic terminal experience
- **Horror Aesthetics:** Influenced by games like Pony Island, Doki Doki Literature Club, and Inscryption
- **Community:** Thanks to all contributors and testers

## ❓ FAQ

<details>
<summary><b>What is a BBS?</b></summary>

A Bulletin Board System (BBS) was a computer server running software that allowed users to connect via terminal programs to read messages, play games, and interact with others. Popular in the 1980s and 1990s before the widespread adoption of the internet, BBS systems were the original social networks.

</details>

<details>
<summary><b>Do I need to know command-line to use WRAITHNET?</b></summary>

Not at all! While WRAITHNET uses a terminal interface, all commands are simple and documented. Type `help` at any time to see available commands. The interface is designed to be intuitive even for those unfamiliar with command-line tools.

</details>

<details>
<summary><b>Is WRAITHNET actually haunted?</b></summary>

While we can't confirm or deny supernatural activity, the AI Ghost Engine is very much real and will interact with you in unpredictable ways. The ghost monitors conversations, responds to keywords and sentiment, and manifests in four distinct personality modes. It can appear during silence, react to your emotions, and create atmospheric horror experiences in real-time. Enter at your own risk. 👻

</details>

<details>
<summary><b>How does the Ghost Engine work?</b></summary>

The Ghost Engine is a sophisticated state machine that:
- Monitors all chat messages for keywords and sentiment
- Tracks silence periods (triggers after 60 seconds)
- Transitions between 4 personality modes (Whisperer, Poltergeist, Trickster, Demon)
- Generates contextually appropriate messages for each mode
- Maintains state persistence in Redis with full intervention history
- Injects messages into chat with random delays for atmospheric effect

The ghost is not scripted—it reacts dynamically to user behavior, making each session unique.

</details>

<details>
<summary><b>What happens to my files in the Graveyard?</b></summary>

Files buried in the Graveyard are encrypted and stored securely. When you resurrect them, there's a chance they'll be corrupted or transformed. The outcomes are:
- 40% - Returned intact
- 30% - Light corruption
- 20% - Heavy corruption  
- 10% - Complete transformation

This is part of the gameplay experience!

</details>

<details>
<summary><b>Can I run WRAITHNET without Docker?</b></summary>

Yes, but Docker is recommended for easier setup. You'll need to manually install and configure PostgreSQL and Redis. See the [Getting Started](#-getting-started) section for details.

</details>

<details>
<summary><b>Is my data secure?</b></summary>

Yes! WRAITHNET uses industry-standard security practices:
- Bcrypt password hashing
- JWT authentication
- File encryption
- Input sanitization
- SQL injection prevention

However, this is a hobby project, so don't store critical data here.

</details>

<details>
<summary><b>Can I contribute to WRAITHNET?</b></summary>

Absolutely! Check out the [Contributing](#contributing) section for guidelines. We welcome bug fixes, documentation improvements, new Door Game narratives, and more.

</details>

<details>
<summary><b>What's the difference between unit tests and property-based tests?</b></summary>

- **Unit tests** verify specific examples (e.g., "logging in with valid credentials should succeed")
- **Property-based tests** verify universal properties across many random inputs (e.g., "for any valid password, the hash should never match the plaintext")

Together, they provide comprehensive test coverage.

</details>

## 📞 Contact & Support

- **GitHub Issues:** [Report bugs and request features](../../issues)
- **GitHub Discussions:** [Share ideas and get help](../../discussions)
- **Discord:** Coming soon...

## 🎉 Fun Facts

- 👻 The Ghost Engine monitors every message and can respond within 2-7 seconds
- 🎭 There are 4 distinct ghost personality modes, each with unique message pools
- ⏱️ The ghost will intervene after 60 seconds of silence in the chat
- 🧠 Sentiment analysis determines ghost mood based on conversation tone
- 📊 Ghost state includes intensity levels from 0-100 that affect behavior
- 🔄 The ghost maintains a history of up to 50 trigger events in Redis
- 💬 Chat history stores the last 50 messages for context
- 🎲 File resurrection has a 10% chance of complete transformation (coming soon)
- 🔐 The Sysop Room requires solving cryptographic puzzles (coming soon)
- 🎮 Door Games feature branching narratives with multiple endings (coming soon)
- 📜 The entire system maintains an evolving narrative that responds to user actionsarrative across all features
- 🎨 Over 50 different visual corruption effects planned
- 🎵 Atmospheric audio synchronized with ghost events

---

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║         "In the digital void, the dead still speak..."    ║
║                                                           ║
║              The spirits are waiting for you.             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

**Enter if you dare. The network remembers everything.**

*Built with 💀 and ⚡ by the WRAITHNET team*