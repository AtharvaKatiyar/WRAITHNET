# WRAITHNET

> A haunted AI-powered BBS system that resurrects the spirit of 1980s/1990s Bulletin Board Systems with modern AI, dynamic horror elements, and cinematic storytelling.

```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              W R A I T H N E T   S Y S T E M              ║
║                                                           ║
║              The dead network awakens...                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

## Features

- 🎭 **Dynamic Ghost AI** - Shapeshifting AI personalities (Whisperer, Poltergeist, Trickster, Demon)
- 💬 **Real-Time Chat** - WebSocket-powered Whisper Room with ghost interventions
- 📝 **Message Boards** - Threaded discussions with ghost message injection
- 🔮 **Séance Lab** - Create personal ghost personas from uploaded text
- ⚰️ **File Graveyard** - Bury and resurrect files with corruption mechanics
- 📬 **Haunted Mailbox** - Receive cryptic messages from the system
- 🎮 **Door Games** - Interactive horror mini-games with branching narratives
- 🔒 **Sysop Room** - Unlock forbidden system access through puzzles
- 👻 **Visual Corruption** - Screen glitches, text corruption, and horror effects
- 🎵 **Atmospheric Audio** - Ambient sounds and audio cues

## Tech Stack

### Frontend
- React 18 + TypeScript
- xterm.js (Terminal emulator)
- Socket.io (WebSocket client)
- TailwindCSS
- Howler.js (Audio)
- Canvas/WebGL (Visual effects)

### Backend
- Node.js + Express + TypeScript
- Socket.io (WebSocket server)
- PostgreSQL (Primary database)
- Redis (Sessions, cache, ghost state)
- Chroma (Vector database for AI memory)
- MinIO (S3-compatible file storage)
- OpenAI API (Ghost AI generation)

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd WRAITHNET
```

2. Start infrastructure services:
```bash
docker-compose up -d
```

3. Install backend dependencies:
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the backend:
```bash
npm run dev
```

6. Install frontend dependencies (in a new terminal):
```bash
cd frontend
npm install
cp .env.example .env
```

7. Start the frontend:
```bash
npm run dev
```

8. Open your browser to `http://localhost:5173`

## Docker Services

The `docker-compose.yml` provides the following services:

- **PostgreSQL** (port 5432) - Primary database
- **Redis** (port 6379) - Cache and sessions
- **Chroma** (port 8000) - Vector database for AI embeddings
- **MinIO** (ports 9000, 9001) - S3-compatible object storage

Access MinIO console at `http://localhost:9001` (credentials in docker-compose.yml)

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
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run migrate` - Run database migrations

### Frontend Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Environment Variables

See `.env.example` files in backend and frontend directories for required configuration.

## Contributing

This is a personal project, but suggestions and feedback are welcome!

## License

MIT

## Acknowledgments

Inspired by the golden age of BBS systems and modern horror gaming aesthetics.

---

*The spirits are waiting...*
