# WRAITHNET Design Document

## Overview

WRAITHNET is a full-stack web application that resurrects the BBS experience with modern AI and horror elements. The system consists of a React-based terminal frontend, a Node.js backend API, WebSocket server for real-time communication, PostgreSQL for structured data, Redis for ephemeral state, a Vector database for AI memory, and integration with AI language models for ghost persona generation.

The architecture prioritizes:
- **Immersion**: Authentic terminal experience with retro aesthetics
- **Real-time responsiveness**: WebSocket-driven chat and ghost events
- **AI intelligence**: Context-aware ghost personalities with memory
- **Scalability**: Support for concurrent users and persistent world state
- **Horror atmosphere**: Visual corruption, audio cues, and unpredictable events

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend Layer                          │
│  React + xterm.js + WebGL Effects + Howler.js Audio        │
│  - Terminal UI rendering                                    │
│  - Command parsing & routing                                │
│  - WebSocket client for real-time features                  │
│  - Visual corruption effects engine                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS/REST + WebSocket
                     │
┌────────────────────▼────────────────────────────────────────┐
│                     Backend Layer                           │
│  Node.js + Express + Socket.io                             │
│  - REST API endpoints                                       │
│  - WebSocket event handling                                 │
│  - Authentication & authorization                           │
│  - Ghost Engine (event manager + FSM)                       │
│  - Corruption Engine                                        │
└─────┬──────────┬──────────┬──────────┬─────────────────────┘
      │          │          │          │
      │          │          │          │
      ▼          ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌─────────┐ ┌──────────────┐
│PostgreSQL│ │ Redis  │ │Vector DB│ │ File Storage │
│          │ │        │ │(Pinecone│ │  (S3/Local)  │
│-Users    │ │-Session│ │/Chroma) │ │              │
│-Boards   │ │-Ghost  │ │         │ │-Buried files │
│-Messages │ │ State  │ │-Personal│ │-Corrupted    │
│-Mailbox  │ │-Presence│ │ Ghost  │ │ versions     │
│-Graveyard│ │        │ │ Memory  │ │              │
│ Metadata │ │        │ │-System  │ │              │
│-Game     │ │        │ │ Ghost   │ │              │
│ State    │ │        │ │ Context │ │              │
└──────────┘ └────────┘ └─────────┘ └──────────────┘
                                │
                                ▼
                        ┌──────────────┐
                        │  AI Service  │
                        │  (OpenAI/    │
                        │   Local LLM) │
                        │              │
                        │-Text gen     │
                        │-Embeddings   │
                        │-Style match  │
                        └──────────────┘
```


### Technology Stack

#### Frontend
- **React 18**: Component-based UI with hooks for state management
- **xterm.js**: Terminal emulator providing authentic command-line experience
- **Socket.io-client**: WebSocket client for real-time communication
- **TailwindCSS**: Utility-first styling for rapid UI development
- **Canvas API / WebGL**: Hardware-accelerated visual corruption effects
- **Howler.js**: Cross-browser audio library for atmospheric sounds
- **Vite**: Fast build tool and dev server

#### Backend
- **Node.js 20+**: JavaScript runtime for server-side logic
- **Express.js**: Web framework for REST API
- **Socket.io**: WebSocket library for real-time bidirectional communication
- **Passport.js**: Authentication middleware supporting multiple strategies
- **bcrypt**: Password hashing for secure credential storage
- **node-cron**: Scheduled task execution for timed ghost events

#### Databases
- **PostgreSQL 15+**: Primary relational database for structured data
- **Redis 7+**: In-memory data store for sessions, presence, and ghost state
- **Pinecone / Chroma**: Vector database for AI embeddings and semantic search

#### AI & ML
- **OpenAI API**: GPT-4 for ghost text generation and conversation
- **OpenAI Embeddings**: text-embedding-ada-002 for semantic memory
- **Langchain**: Framework for LLM orchestration and prompt management

#### Storage
- **AWS S3 / Supabase Storage**: Object storage for buried files
- **Multer**: Middleware for handling file uploads

#### DevOps
- **Docker**: Containerization for consistent deployment
- **Docker Compose**: Multi-container orchestration for local development
- **GitHub Actions**: CI/CD pipeline automation

## Components and Interfaces

### Frontend Components

#### 1. Terminal Component
**Responsibility**: Core terminal emulator and command interface

**Key Methods**:
- `renderPrompt()`: Display command prompt with user context
- `parseCommand(input: string)`: Parse user input into command and arguments
- `executeCommand(command: Command)`: Route command to appropriate handler
- `displayOutput(text: string, style?: Style)`: Render text with optional styling
- `applyCorruption(effect: CorruptionEffect)`: Apply visual glitch effects

**State**:
- Current directory/context
- Command history
- Output buffer
- Active corruption effects

#### 2. WebSocket Manager
**Responsibility**: Manage real-time connection and event handling

**Key Methods**:
- `connect()`: Establish WebSocket connection with authentication
- `disconnect()`: Clean disconnect and cleanup
- `emit(event: string, data: any)`: Send event to server
- `on(event: string, handler: Function)`: Register event listener
- `reconnect()`: Handle connection drops with exponential backoff

**Events Handled**:
- `chat:message`: Incoming chat messages
- `ghost:intervention`: Ghost events and effects
- `presence:update`: User join/leave notifications
- `mailbox:new`: New mail notifications
- `thread:update`: Message board updates

#### 3. Corruption Effects Engine
**Responsibility**: Render visual glitches and horror effects

**Key Methods**:
- `glitch(intensity: number, duration: number)`: Screen glitch effect
- `flicker(pattern: FlickerPattern)`: Screen flicker
- `textCorrupt(text: string, level: number)`: Corrupt text characters
- `staticOverlay(opacity: number)`: Add static noise overlay
- `colorShift(hue: number)`: Shift color palette

**Effect Types**:
- Screen shake
- Character replacement
- Color inversion
- Scanline artifacts
- CRT distortion

#### 4. Audio Manager
**Responsibility**: Play atmospheric sounds and audio cues

**Key Methods**:
- `playSound(soundId: string, volume?: number)`: Play one-shot sound
- `playAmbient(trackId: string, loop: boolean)`: Background ambient audio
- `stopAll()`: Stop all audio
- `fadeOut(duration: number)`: Fade out current audio

**Sound Library**:
- Whispers
- Static bursts
- Keyboard typing
- Door creaks
- Heartbeat
- Ambient drones


### Backend Components

#### 1. Authentication Service
**Responsibility**: User authentication and session management

**API Endpoints**:
- `POST /api/auth/register`: Create new user account
- `POST /api/auth/login`: Authenticate and create session
- `POST /api/auth/logout`: Terminate session
- `GET /api/auth/session`: Validate current session

**Key Methods**:
- `hashPassword(password: string)`: Hash password with bcrypt
- `verifyPassword(password: string, hash: string)`: Verify password
- `generateToken(userId: string)`: Create JWT token
- `validateToken(token: string)`: Verify JWT token

**Database Schema**:
```typescript
User {
  id: UUID
  username: string (unique)
  email: string (unique)
  passwordHash: string
  createdAt: timestamp
  lastLogin: timestamp
}

Session {
  id: UUID
  userId: UUID (foreign key)
  token: string
  expiresAt: timestamp
}
```

#### 2. Message Board Service
**Responsibility**: Forum thread and message management

**API Endpoints**:
- `GET /api/boards/threads`: List all threads
- `GET /api/boards/threads/:id`: Get thread with messages
- `POST /api/boards/threads`: Create new thread
- `POST /api/boards/threads/:id/messages`: Reply to thread
- `GET /api/boards/threads/:id/messages`: Get thread messages
- `GET /api/boards/replies`: Get user's reply history with thread and message IDs
- `DELETE /api/boards/messages/:messageId`: Delete a reply by message ID

**Key Methods**:
- `createThread(userId: string, title: string, content: string)`: Create thread
- `addMessage(threadId: string, userId: string, content: string)`: Add message
- `getThreads(filters?: ThreadFilters)`: List threads with pagination
- `getMessages(threadId: string)`: Get all messages in thread
- `getUserReplies(userId: string)`: Get all threads user has replied to with message IDs
- `deleteMessage(messageId: string, userId: string)`: Delete a user's reply and update thread timestamp

**Database Schema**:
```typescript
Thread {
  id: UUID
  authorId: UUID (foreign key)
  title: string
  createdAt: timestamp
  updatedAt: timestamp
  isHidden: boolean
  isGhostThread: boolean
}

Message {
  id: UUID
  threadId: UUID (foreign key)
  authorId: UUID (foreign key, nullable for ghost messages)
  content: string
  isCorrupted: boolean
  isGhostMessage: boolean
  createdAt: timestamp
}
```

#### 3. Ghost Engine
**Responsibility**: Manage ghost behavior, personality, and event triggering

**Core Components**:

**a) Ghost State Machine**
```typescript
enum GhostMode {
  WHISPERER = 'whisperer',
  POLTERGEIST = 'poltergeist',
  TRICKSTER = 'trickster',
  DEMON = 'demon'
}

interface GhostState {
  currentMode: GhostMode
  intensity: number (0-100)
  lastInterventionTime: timestamp
  triggerHistory: TriggerEvent[]
}
```

**b) Trigger System**
```typescript
interface Trigger {
  type: 'keyword' | 'silence' | 'sentiment' | 'time' | 'narrative'
  condition: any
  action: GhostAction
  priority: number
}
```

**Key Methods**:
- `evaluateTriggers(context: Context)`: Check all triggers and fire actions
- `transitionMode(newMode: GhostMode)`: Change ghost personality
- `generateMessage(mode: GhostMode, context: string)`: Create ghost message via AI
- `scheduleIntervention(delay: number, action: GhostAction)`: Queue future event
- `injectMessage(target: string, message: string)`: Insert ghost message

**Trigger Examples**:
- Keyword "help" → Whisperer mode, send cryptic hint
- 60 seconds silence → Poltergeist mode, screen glitch
- Negative sentiment → Demon mode, threatening message
- 3:00 AM server time → Unlock hidden thread
- User completes puzzle → Sysop Room unlock

#### 4. Séance Lab Service
**Responsibility**: Personal ghost creation and conversation

**API Endpoints**:
- `POST /api/seance/upload`: Upload text to create/update ghost
- `POST /api/seance/chat`: Send message to personal ghost
- `GET /api/seance/history`: Get conversation history
- `GET /api/seance/ghost`: Get current ghost persona info

**Key Methods**:
- `processText(userId: string, text: string)`: Generate embeddings from uploaded text
- `createPersona(userId: string, embeddings: number[])`: Initialize ghost persona
- `updatePersona(userId: string, newEmbeddings: number[])`: Merge new text into persona
- `generateResponse(userId: string, userMessage: string)`: Query AI with persona context
- `retrieveMemory(userId: string, query: string)`: Semantic search in Vector DB

**Workflow**:
1. User uploads text (diary, letters, etc.)
2. Text is chunked and embedded using OpenAI embeddings
3. Embeddings stored in Vector DB with user ID
4. When user chats, relevant memories retrieved via semantic search
5. AI generates response using retrieved context + personality prompt
6. Conversation stored for future context

**Vector DB Schema**:
```typescript
PersonaMemory {
  id: string
  userId: string
  embedding: number[] (1536 dimensions for ada-002)
  text: string (original chunk)
  metadata: {
    uploadDate: timestamp
    source: string
  }
}
```


#### 5. File Graveyard Service
**Responsibility**: File burial, resurrection, and corruption

**API Endpoints**:
- `POST /api/graveyard/bury`: Bury a file
- `POST /api/graveyard/raise/:graveId`: Resurrect a file
- `GET /api/graveyard/personal`: List user's buried files
- `GET /api/graveyard/communal`: List public graveyard
- `GET /api/graveyard/inspect/:graveId`: View grave details

**Key Methods**:
- `buryFile(userId: string, file: File, isPublic: boolean)`: Store file and create grave
- `generateEpitaph(fileName: string, fileContent?: string)`: AI-generated epitaph
- `raiseFile(graveId: string)`: Retrieve file with potential corruption
- `applyCorruption(file: Buffer, level: number)`: Corrupt file contents
- `determineCorruptionLevel()`: Random corruption intensity (0-100)

**Corruption Algorithms**:
- **Text files**: Character substitution, line shuffling, word replacement
- **Images**: Pixel manipulation, color shifts, glitch artifacts
- **Binary files**: Byte flipping, chunk reordering
- **No corruption**: 40% chance file returns intact
- **Light corruption**: 30% chance minor changes
- **Heavy corruption**: 20% chance significant changes
- **Transformation**: 10% chance file becomes something else

**Database Schema**:
```typescript
Grave {
  id: UUID
  userId: UUID (foreign key)
  fileName: string
  fileSize: number
  fileType: string
  storageKey: string (S3 key or file path)
  epitaph: string
  isPublic: boolean
  buriedAt: timestamp
  raisedAt: timestamp (nullable)
  corruptionApplied: boolean
}

GhostComment {
  id: UUID
  graveId: UUID (foreign key)
  comment: string
  createdAt: timestamp
}
```

#### 6. Mailbox Service
**Responsibility**: Private message delivery and notifications

**API Endpoints**:
- `GET /api/mailbox`: Get all messages
- `GET /api/mailbox/:id`: Get specific message
- `PUT /api/mailbox/:id/read`: Mark message as read
- `DELETE /api/mailbox/:id`: Delete message

**Key Methods**:
- `sendMessage(userId: string, type: MessageType, content: string)`: Create message
- `getUnreadCount(userId: string)`: Count unread messages
- `markAsRead(messageId: string)`: Update read status

**Message Types**:
- `SEANCE_TRANSCRIPT`: Conversation summary
- `GHOST_WARNING`: Supernatural alert
- `SYSTEM_ALERT`: Technical notification
- `LORE_FRAGMENT`: Story piece
- `PUZZLE_PIECE`: Clue for mysteries

**Database Schema**:
```typescript
MailMessage {
  id: UUID
  userId: UUID (foreign key)
  type: MessageType
  subject: string
  content: string
  isRead: boolean
  createdAt: timestamp
}
```

#### 7. Sysop Room Service
**Responsibility**: Manage locked content and dangerous commands

**API Endpoints**:
- `GET /api/sysop/status`: Check access status
- `POST /api/sysop/unlock`: Attempt unlock with puzzle solution
- `GET /api/sysop/logs`: View corrupted system logs
- `POST /api/sysop/command`: Execute dangerous command
- `GET /api/sysop/threads`: List hidden threads

**Key Methods**:
- `checkAccess(userId: string)`: Verify if user has unlocked Sysop Room
- `validatePuzzleSolution(solution: string)`: Check puzzle answer
- `unlockRoom(userId: string)`: Grant access
- `executeCommand(userId: string, command: string)`: Process dangerous command
- `revealHiddenThread(threadId: string)`: Make thread visible

**Unlock Conditions**:
- Collect 5 lore fragments from mailbox
- Complete specific Door Game
- Trigger specific ghost event sequence
- Solve cryptographic puzzle

**Database Schema**:
```typescript
SysopAccess {
  id: UUID
  userId: UUID (foreign key)
  unlockedAt: timestamp
  puzzleSolution: string
}

HiddenThread {
  threadId: UUID (foreign key)
  unlockCondition: string
  isRevealed: boolean
}
```

#### 8. Door Games Engine
**Responsibility**: Interactive narrative game management

**API Endpoints**:
- `GET /api/games`: List available games
- `POST /api/games/:gameId/start`: Initialize game session
- `POST /api/games/:gameId/choice`: Make choice and progress
- `GET /api/games/:gameId/state`: Get current game state
- `POST /api/games/:gameId/save`: Save progress

**Key Methods**:
- `initializeGame(userId: string, gameId: string)`: Create game session
- `processChoice(sessionId: string, choiceId: string)`: Branch narrative
- `renderScene(scene: Scene)`: Generate scene text with ASCII art
- `triggerGhostTakeover(sessionId: string)`: Interrupt with ghost event
- `checkUnlockConditions(userId: string, gameId: string)`: Verify access

**Game Structure**:
```typescript
Game {
  id: string
  title: string
  description: string
  isLocked: boolean
  unlockCondition: string
  scenes: Scene[]
}

Scene {
  id: string
  text: string
  asciiArt?: string
  choices: Choice[]
  effects?: Effect[]
}

Choice {
  id: string
  text: string
  nextSceneId: string
  consequences?: any
}

GameSession {
  id: UUID
  userId: UUID
  gameId: string
  currentSceneId: string
  history: string[]
  variables: Record<string, any>
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Available Games**:
1. **Abandoned Hospital**: Explore haunted medical facility
2. **EVP Static Room**: Decode ghost voices from static
3. **Ouija Terminal**: Digital spirit board communication
4. **Catacombs Maze**: Navigate underground tunnels
5. **The Last Transmission**: Locked finale game


#### 9. WebSocket Event Handler
**Responsibility**: Real-time communication for chat and ghost events

**Socket Events**:

**Client → Server**:
- `chat:send`: User sends chat message
- `chat:join`: User enters Whisper Room
- `chat:leave`: User exits Whisper Room
- `presence:heartbeat`: Keep-alive signal

**Server → Client**:
- `chat:message`: Broadcast chat message to all users
- `chat:history`: Send recent chat history on join
- `ghost:message`: Ghost intervention in chat
- `ghost:effect`: Trigger visual/audio effect
- `ghost:whisper`: Private message to specific user
- `presence:update`: User joined/left notification
- `mailbox:notification`: New mail alert
- `thread:new`: New message board thread
- `thread:update`: Thread updated

**Key Methods**:
- `handleConnection(socket: Socket)`: Initialize new connection
- `handleDisconnection(socket: Socket)`: Cleanup on disconnect
- `broadcastToRoom(room: string, event: string, data: any)`: Send to all in room
- `sendToUser(userId: string, event: string, data: any)`: Send to specific user
- `trackPresence(userId: string, status: string)`: Update user presence in Redis

**Connection Flow**:
1. Client connects with authentication token
2. Server validates token and associates socket with user ID
3. User joins relevant rooms (chat, notifications)
4. Server sends initial state (chat history, presence list)
5. Client and server exchange events
6. On disconnect, server cleans up presence and socket

#### 10. Corruption Engine
**Responsibility**: Generate corrupted content and visual effects

**Key Methods**:
- `corruptText(text: string, intensity: number)`: Replace characters with glyphs
- `corruptFile(buffer: Buffer, type: string, intensity: number)`: Modify file data
- `generateGlitchEffect()`: Create visual effect parameters
- `selectCorruptionType()`: Randomly choose corruption algorithm

**Text Corruption Techniques**:
- Character substitution (a→ą, e→ę, o→ø)
- Zalgo text (combining diacritical marks)
- Missing characters (random deletion)
- Repeated characters (ssssstutter)
- Reversed words or phrases
- Inserted symbols (█, ▓, ░, ▒)

**Visual Effect Parameters**:
```typescript
interface GlitchEffect {
  type: 'shake' | 'flicker' | 'static' | 'colorShift' | 'scanlines'
  intensity: number (0-100)
  duration: number (milliseconds)
  pattern?: string
}
```

## Data Models

### User Model
```typescript
interface User {
  id: string
  username: string
  email: string
  passwordHash: string
  createdAt: Date
  lastLogin: Date
  
  // Relations
  threads: Thread[]
  messages: Message[]
  graves: Grave[]
  mailMessages: MailMessage[]
  gameSessions: GameSession[]
  sysopAccess?: SysopAccess
}
```

### Thread Model
```typescript
interface Thread {
  id: string
  authorId: string
  title: string
  createdAt: Date
  updatedAt: Date
  isHidden: boolean
  isGhostThread: boolean
  
  // Relations
  author: User
  messages: Message[]
}
```

### Message Model
```typescript
interface Message {
  id: string
  threadId: string
  authorId?: string // Null for ghost messages
  content: string
  isCorrupted: boolean
  isGhostMessage: boolean
  createdAt: Date
  
  // Relations
  thread: Thread
  author?: User
}
```

### ChatMessage Model (Redis)
```typescript
interface ChatMessage {
  id: string
  userId?: string // Null for ghost
  username: string
  content: string
  isGhost: boolean
  timestamp: number
}
```

### GhostState Model (Redis)
```typescript
interface GhostState {
  currentMode: 'whisperer' | 'poltergeist' | 'trickster' | 'demon'
  intensity: number
  lastInterventionTime: number
  triggerHistory: Array<{
    type: string
    timestamp: number
    action: string
  }>
}
```

### PersonaMemory Model (Vector DB)
```typescript
interface PersonaMemory {
  id: string
  userId: string
  embedding: number[] // 1536 dimensions
  text: string
  metadata: {
    uploadDate: Date
    source: string
    chunkIndex: number
  }
}
```

### Grave Model
```typescript
interface Grave {
  id: string
  userId: string
  fileName: string
  fileSize: number
  fileType: string
  storageKey: string
  epitaph: string
  isPublic: boolean
  buriedAt: Date
  raisedAt?: Date
  corruptionApplied: boolean
  
  // Relations
  user: User
  comments: GhostComment[]
}
```

### GhostComment Model
```typescript
interface GhostComment {
  id: string
  graveId: string
  comment: string
  createdAt: Date
  
  // Relations
  grave: Grave
}
```

### MailMessage Model
```typescript
interface MailMessage {
  id: string
  userId: string
  type: 'SEANCE_TRANSCRIPT' | 'GHOST_WARNING' | 'SYSTEM_ALERT' | 'LORE_FRAGMENT' | 'PUZZLE_PIECE'
  subject: string
  content: string
  isRead: boolean
  createdAt: Date
  
  // Relations
  user: User
}
```

### GameSession Model
```typescript
interface GameSession {
  id: string
  userId: string
  gameId: string
  currentSceneId: string
  history: string[]
  variables: Record<string, any>
  createdAt: Date
  updatedAt: Date
  
  // Relations
  user: User
}
```

### SysopAccess Model
```typescript
interface SysopAccess {
  id: string
  userId: string
  unlockedAt: Date
  puzzleSolution: string
  
  // Relations
  user: User
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication & Session Properties

**Property 1: Password encryption on registration**
*For any* valid user credentials, when a new account is created, the stored password hash should not match the plaintext password and should be verifiable using bcrypt.
**Validates: Requirements 1.1**

**Property 2: Valid login establishes session**
*For any* user with valid credentials, attempting login should result in a valid session token that can be used for authenticated requests.
**Validates: Requirements 1.2**

**Property 3: Session data completeness**
*For any* user with existing data (ghost personas, graves, game progress), establishing a session should load all associated data correctly.
**Validates: Requirements 1.3**

**Property 4: Invalid credentials rejection**
*For any* invalid credential combination (wrong password, non-existent user), login attempts should be rejected with an error message.
**Validates: Requirements 1.4**

**Property 5: Logout persistence**
*For any* user session with modified data, logging out should persist all changes to the database before session termination.
**Validates: Requirements 1.5**

### Message Board Properties

**Property 6: Thread display completeness**
*For any* message board state, accessing the board should display all non-hidden threads with their metadata.
**Validates: Requirements 2.1**

**Property 7: Message chronological ordering**
*For any* thread with multiple messages, displaying the thread should show messages in chronological order by creation timestamp.
**Validates: Requirements 2.2**

**Property 8: Thread creation persistence**
*For any* valid thread content, creating a thread should persist it to the database and make it visible to all users immediately.
**Validates: Requirements 2.3**

**Property 9: Reply appending**
*For any* existing thread, adding a reply should append the message to the thread and update the thread's timestamp to the reply time.
**Validates: Requirements 2.4**

**Property 10: Ghost message marking**
*For any* ghost-injected message, it should be marked with `isGhostMessage: true` and rendered with distinct styling.
**Validates: Requirements 2.5, 3.4**

**Property 67: Reply history completeness**
*For any* user with replies to threads, requesting their reply history should return all threads they have replied to with the correct message IDs of their replies.
**Validates: Requirements 2.6**

**Property 68: Reply deletion removes message**
*For any* reply message, deleting it using its message ID should remove the message from the thread and update the thread's timestamp.
**Validates: Requirements 2.7**

### Ghost Behavior Properties

**Property 11: Keyword trigger mode transition**
*For any* configured keyword trigger, when detected in chat, the ghost should transition to the associated personality mode.
**Validates: Requirements 5.1**

**Property 12: Silence trigger activation**
*For any* chat room, when no messages are sent for the configured silence threshold, a ghost intervention should be triggered.
**Validates: Requirements 5.2**

**Property 13: Mode-specific message generation**
*For any* ghost personality mode (Whisperer, Poltergeist, Trickster, Demon), generated messages should match the mode's characteristics (subtle/aggressive/playful/threatening).
**Validates: Requirements 5.4, 5.5, 5.6, 5.7**

**Property 14: Ghost event sequencing**
*For any* set of simultaneously triggered ghost events, they should be executed in priority order without conflicts.
**Validates: Requirements 3.5, 17.4**

### Real-Time Communication Properties

**Property 15: Chat message broadcast**
*For any* chat message sent by a user, all connected users in the Whisper Room should receive the message.
**Validates: Requirements 4.2**

**Property 16: Presence tracking**
*For any* user joining or leaving the Whisper Room, all connected users should receive a presence update event.
**Validates: Requirements 4.3, 4.4**

**Property 17: WebSocket reconnection**
*For any* dropped WebSocket connection, the client should attempt reconnection and restore user state upon success.
**Validates: Requirements 13.3**

**Property 18: Broadcast reliability**
*For any* WebSocket broadcast event, all connected clients should receive the event without message loss.
**Validates: Requirements 13.4**

**Property 19: Private whisper targeting**
*For any* private whisper sent to a specific user, only that user should receive the message, not other connected users.
**Validates: Requirements 6.4**

### Séance Lab Properties

**Property 20: Persona creation from text**
*For any* uploaded text content, the system should generate embeddings and create a retrievable ghost persona in the Vector DB.
**Validates: Requirements 7.1, 7.2**

**Property 21: Persona round-trip**
*For any* created ghost persona, logging out and logging back in should retrieve the same persona with conversation continuity.
**Validates: Requirements 7.5**

**Property 22: Persona evolution**
*For any* existing ghost persona, uploading additional text should update the persona's embeddings while maintaining previous memories.
**Validates: Requirements 7.4**

**Property 23: Style-matched responses**
*For any* personal ghost conversation, responses should be generated using the persona's embeddings as context to match the learned style.
**Validates: Requirements 7.3**

### File Graveyard Properties

**Property 24: File burial storage**
*For any* valid file, executing the bury command should store the file in file storage, create a database entry, and generate an epitaph.
**Validates: Requirements 8.1**

**Property 25: Graveyard display completeness**
*For any* user's buried files, viewing the Personal Graveyard should display all files with metadata and epitaphs.
**Validates: Requirements 8.2**

**Property 26: Communal graveyard visibility**
*For any* publicly buried file from any user, it should appear in the Communal Graveyard for all users.
**Validates: Requirements 8.3**

**Property 27: File resurrection retrieval**
*For any* buried file, executing the raise command should retrieve the file from storage (potentially with corruption applied).
**Validates: Requirements 8.4**

**Property 28: Corruption randomness distribution**
*For any* large sample of resurrected files, the distribution of outcomes (intact/light corruption/heavy corruption/transformation) should approximate the configured probabilities.
**Validates: Requirements 8.5**

**Property 29: File encryption on burial**
*For any* buried file, the stored file should be encrypted and not readable without decryption.
**Validates: Requirements 16.1, 18.2**

### Mailbox Properties

**Property 30: Mailbox chronological ordering**
*For any* user's mailbox, messages should be displayed in chronological order by creation timestamp.
**Validates: Requirements 9.1**

**Property 31: Automatic message delivery**
*For any* system-generated message (séance transcript, ghost warning, lore fragment), it should be delivered to the user's mailbox and marked as unread.
**Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**

**Property 32: Read status update**
*For any* mailbox message, when a user reads it, the message should be marked as read and the mailbox display should update.
**Validates: Requirements 9.7**

### Sysop Room Properties

**Property 33: Unauthorized access denial**
*For any* user without Sysop Room access, attempting to enter should be denied with a locked message.
**Validates: Requirements 10.1**

**Property 34: Puzzle unlock**
*For any* correct puzzle solution, the Sysop Room should be unlocked for that user.
**Validates: Requirements 10.2**

**Property 35: Hidden thread revelation**
*For any* hidden thread with unlock conditions, when conditions are met, the thread should become visible on the message board.
**Validates: Requirements 3.3, 10.4**

### Door Games Properties

**Property 36: Game initialization**
*For any* Door Game, starting it should create a game session with initial state and display the opening narrative.
**Validates: Requirements 11.2**

**Property 37: Choice branching**
*For any* game choice, selecting it should update the game state and transition to the corresponding next scene.
**Validates: Requirements 11.3**

**Property 38: Game progress persistence**
*For any* game session, exiting or completing the game should save the current state to the database.
**Validates: Requirements 11.6**

**Property 39: Locked game enforcement**
*For any* locked Door Game, attempting to start it should be prevented and unlock requirements should be displayed.
**Validates: Requirements 11.7**

### Command Parsing Properties

**Property 40: Valid command execution**
*For any* valid command with correct syntax, the system should parse and execute it with appropriate feedback.
**Validates: Requirements 12.1**

**Property 41: Invalid command error handling**
*For any* invalid or malformed command, the system should display an error message with command suggestions.
**Validates: Requirements 12.2**

**Property 42: Navigation consistency**
*For any* feature navigation command, executing it should transition to the correct feature context.
**Validates: Requirements 12.6**

### Data Persistence Properties

**Property 43: Immediate data persistence**
*For any* user data modification (thread creation, file burial, game progress), the change should be persisted to the database immediately.
**Validates: Requirements 14.1**

**Property 44: Complete data retrieval on login**
*For any* user login, all associated data (threads, messages, graves, personas, game sessions) should be retrieved from the database.
**Validates: Requirements 14.2**

**Property 45: Ghost state synchronization**
*For any* ghost mode transition, the new state should be updated in Redis for real-time access.
**Validates: Requirements 14.3**

**Property 46: Dual storage consistency**
*For any* file graveyard operation, both the database metadata and file storage should be updated consistently.
**Validates: Requirements 14.5**

### AI Integration Properties

**Property 47: AI context inclusion**
*For any* ghost message generation, the AI should be queried with appropriate personality prompts and conversation context.
**Validates: Requirements 15.1**

**Property 48: Embedding generation and storage**
*For any* personal ghost creation, embeddings should be generated from the uploaded text and stored in the Vector DB.
**Validates: Requirements 15.2**

**Property 49: Memory retrieval for context**
*For any* personal ghost conversation, relevant embeddings should be retrieved from the Vector DB and included in the AI context.
**Validates: Requirements 15.3**

**Property 50: Prompt adjustment on mode change**
*For any* ghost personality mode transition, the AI prompt should be updated to reflect the new mode's characteristics.
**Validates: Requirements 15.4**

**Property 51: Response validation**
*For any* AI-generated response, it should be validated and sanitized before being displayed to users.
**Validates: Requirements 15.5**

### Security Properties

**Property 52: Password hashing**
*For any* stored password, it should be hashed using bcrypt and the hash should not be reversible to plaintext.
**Validates: Requirements 18.1**

**Property 53: Authentication token validation**
*For any* API request requiring authentication, the system should validate the token and enforce authorization rules.
**Validates: Requirements 18.3**

**Property 54: Input sanitization**
*For any* user input, it should be sanitized to prevent SQL injection, XSS, and other injection attacks.
**Validates: Requirements 18.4**

### Error Handling Properties

**Property 55: Error logging**
*For any* error that occurs, it should be logged with sufficient detail (timestamp, user context, stack trace) for debugging.
**Validates: Requirements 20.1**

**Property 56: In-character error messages**
*For any* user-facing error, the error message should maintain the horror atmosphere with in-character text.
**Validates: Requirements 20.2**

**Property 57: Service failure fallback**
*For any* external service failure (AI API, file storage), the system should implement fallback behavior and retry logic.
**Validates: Requirements 20.3**

**Property 58: AI unavailability fallback**
*For any* AI model unavailability, the system should use cached responses or simplified ghost behavior instead of failing.
**Validates: Requirements 20.4**

**Property 59: Data integrity on critical errors**
*For any* critical error, the system should prevent data loss and maintain database consistency.
**Validates: Requirements 20.5**


## Error Handling

### Error Categories

#### 1. Authentication Errors
- **Invalid Credentials**: Return 401 with in-character message "The spirits reject your presence..."
- **Session Expired**: Return 401 with "Your connection to the realm has faded..."
- **Token Invalid**: Return 403 with "The wards prevent your passage..."

#### 2. Validation Errors
- **Invalid Input**: Return 400 with specific field errors in atmospheric language
- **Missing Required Fields**: Return 400 with "The ritual is incomplete..."
- **File Too Large**: Return 413 with "The burden is too great for the graveyard..."

#### 3. Resource Errors
- **Not Found**: Return 404 with "Lost in the void..."
- **Already Exists**: Return 409 with "This presence already haunts these halls..."
- **Forbidden**: Return 403 with "The spirits forbid this action..."

#### 4. External Service Errors
- **AI API Failure**: Fallback to cached responses or simplified ghost behavior
- **Database Connection Lost**: Retry with exponential backoff, queue operations
- **File Storage Unavailable**: Queue burial/resurrection operations for retry
- **Vector DB Unavailable**: Use simplified persona without memory retrieval

#### 5. System Errors
- **Internal Server Error**: Return 500 with "The system convulses with dark energy..."
- **Rate Limit Exceeded**: Return 429 with "The spirits grow weary of your demands..."
- **Service Unavailable**: Return 503 with "The connection to the other side weakens..."

### Error Handling Strategies

#### Graceful Degradation
- **AI Unavailable**: Use pre-written ghost messages from a fallback library
- **Vector DB Down**: Skip memory retrieval, use base persona prompts
- **Redis Down**: Fall back to database for session storage (slower but functional)
- **File Storage Down**: Queue operations and notify user of delay

#### Retry Logic
- **Transient Failures**: Exponential backoff (1s, 2s, 4s, 8s, 16s max)
- **AI Rate Limits**: Queue requests and process with rate limiting
- **Database Deadlocks**: Automatic retry up to 3 times
- **Network Timeouts**: Retry with increased timeout

#### Logging Strategy
```typescript
interface ErrorLog {
  timestamp: Date
  level: 'error' | 'warn' | 'info'
  category: string
  message: string
  userId?: string
  requestId: string
  stackTrace?: string
  context: Record<string, any>
}
```

**Log Levels**:
- **Error**: System failures, unhandled exceptions, data corruption
- **Warn**: Degraded service, fallback activation, retry attempts
- **Info**: Normal operations, user actions, ghost events

**Log Destinations**:
- Console (development)
- File rotation (production)
- External logging service (e.g., Datadog, Sentry)

#### User Notification
- **Critical Errors**: Display in-character error message, log user out if necessary
- **Degraded Service**: Show subtle warning in terminal (e.g., "The connection flickers...")
- **Queued Operations**: Notify user that action will complete when service recovers
- **Ghost Intervention**: Frame some errors as intentional ghost interference

## Testing Strategy

### Unit Testing

**Framework**: Jest for both frontend and backend

**Coverage Goals**:
- Core business logic: 80%+ coverage
- Utility functions: 90%+ coverage
- API endpoints: 70%+ coverage

**Key Unit Test Areas**:

1. **Authentication Service**
   - Password hashing and verification
   - Token generation and validation
   - Session management

2. **Command Parser**
   - Valid command parsing
   - Invalid command handling
   - Argument extraction

3. **Corruption Engine**
   - Text corruption algorithms
   - File corruption logic
   - Effect parameter generation

4. **Ghost State Machine**
   - Mode transitions
   - Trigger evaluation
   - State persistence

5. **Data Models**
   - Model validation
   - Relationship handling
   - Serialization/deserialization

### Property-Based Testing

**Framework**: fast-check (JavaScript/TypeScript property-based testing library)

**Configuration**: Each property test should run a minimum of 100 iterations to ensure thorough coverage of the input space.

**Tagging Convention**: Each property-based test MUST be tagged with a comment explicitly referencing the correctness property from this design document using the format: `**Feature: wraithnet, Property {number}: {property_text}**`

**Key Property Test Areas**:

1. **Authentication Properties**
   - Test password hashing with random passwords
   - Test session establishment with random valid credentials
   - Test invalid credential rejection with random invalid inputs

2. **Message Board Properties**
   - Test thread ordering with random thread creation sequences
   - Test message chronological ordering with random message timestamps
   - Test ghost message marking with random injection patterns

3. **Ghost Behavior Properties**
   - Test keyword triggers with random chat messages
   - Test mode transitions with random trigger sequences
   - Test message generation consistency across modes

4. **File Graveyard Properties**
   - Test burial/resurrection with random file types and sizes
   - Test corruption distribution over large sample sizes
   - Test encryption with random file contents

5. **Séance Lab Properties**
   - Test persona creation with random text inputs
   - Test persona persistence across sessions
   - Test memory retrieval with random conversation contexts

6. **Data Persistence Properties**
   - Test immediate persistence with random data modifications
   - Test complete data retrieval with random user states
   - Test dual storage consistency with random graveyard operations

**Example Property Test Structure**:
```typescript
// **Feature: wraithnet, Property 1: Password encryption on registration**
test('password hashing property', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 8, maxLength: 128 }), // Random passwords
      async (password) => {
        const hash = await hashPassword(password);
        expect(hash).not.toBe(password);
        expect(await verifyPassword(password, hash)).toBe(true);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Framework**: Supertest for API testing, Playwright for end-to-end

**Key Integration Test Scenarios**:

1. **User Journey: Registration to First Ghost Encounter**
   - Register account
   - Login
   - Access message board
   - Receive ghost message
   - Verify mailbox notification

2. **User Journey: Séance Lab Workflow**
   - Upload text to Séance Lab
   - Verify persona creation
   - Send message to ghost
   - Receive style-matched response
   - Logout and login
   - Verify conversation continuity

3. **User Journey: File Graveyard Cycle**
   - Bury file
   - View Personal Graveyard
   - Inspect grave
   - Raise file
   - Verify corruption or intact return

4. **User Journey: Door Game Completion**
   - Start Door Game
   - Make choices
   - Experience ghost takeover
   - Complete game
   - Verify progress saved

5. **Real-Time Communication**
   - Multiple users join Whisper Room
   - Send messages
   - Verify all receive broadcasts
   - Ghost intervention
   - Verify effects delivered

### Performance Testing

**Tools**: Artillery for load testing, Lighthouse for frontend performance

**Key Metrics**:
- API response time: < 200ms (p95)
- WebSocket message latency: < 100ms
- Database query time: < 50ms (p95)
- AI response time: < 3s (p95)
- Frontend initial load: < 2s
- Time to interactive: < 3s

**Load Test Scenarios**:
- 100 concurrent users browsing message board
- 50 concurrent users in Whisper Room
- 20 concurrent AI requests (Séance Lab)
- 10 concurrent file uploads (Graveyard)

### Security Testing

**Tools**: OWASP ZAP for vulnerability scanning, npm audit for dependency checks

**Test Areas**:
- SQL injection attempts
- XSS attack vectors
- CSRF protection
- Authentication bypass attempts
- Authorization escalation
- Rate limiting enforcement
- File upload validation
- Input sanitization

### Manual Testing Checklist

**Atmosphere & Immersion**:
- [ ] Terminal aesthetics feel authentic
- [ ] Visual corruption effects are impactful
- [ ] Audio cues enhance horror atmosphere
- [ ] Ghost interventions feel unpredictable
- [ ] Error messages maintain character
- [ ] Navigation feels intuitive

**Ghost Behavior**:
- [ ] Personality modes feel distinct
- [ ] Transitions are smooth and logical
- [ ] Messages match mode characteristics
- [ ] Timing feels natural, not robotic
- [ ] Personal ghosts feel unique

**User Experience**:
- [ ] Commands are discoverable
- [ ] Help system is useful
- [ ] Feedback is clear
- [ ] Loading states are handled
- [ ] Errors are understandable

## Deployment Architecture

### Development Environment

```
Docker Compose Stack:
- Frontend (Vite dev server): localhost:5173
- Backend API: localhost:3000
- PostgreSQL: localhost:5432
- Redis: localhost:6379
- Chroma (Vector DB): localhost:8000
- MinIO (S3-compatible storage): localhost:9000
```

### Production Environment

```
Cloud Infrastructure (AWS/DigitalOcean):
- Frontend: Static hosting (S3 + CloudFront or Vercel)
- Backend: Container service (ECS/Fargate or App Platform)
- PostgreSQL: Managed database (RDS or Managed PostgreSQL)
- Redis: Managed cache (ElastiCache or Managed Redis)
- Vector DB: Pinecone cloud or self-hosted Chroma
- File Storage: S3 or Spaces
- Load Balancer: ALB or managed load balancer
- SSL/TLS: Certificate Manager or Let's Encrypt
```

### CI/CD Pipeline

**GitHub Actions Workflow**:

1. **On Pull Request**:
   - Run linting (ESLint, Prettier)
   - Run unit tests
   - Run property-based tests
   - Run integration tests
   - Build frontend and backend
   - Security scan (npm audit, Snyk)

2. **On Merge to Main**:
   - All PR checks
   - Build Docker images
   - Push to container registry
   - Deploy to staging environment
   - Run smoke tests
   - Manual approval gate

3. **On Release Tag**:
   - Deploy to production
   - Run health checks
   - Monitor error rates
   - Rollback on failure

### Monitoring & Observability

**Metrics to Track**:
- Request rate and latency (API endpoints)
- WebSocket connection count and message rate
- Ghost event frequency and types
- AI API usage and costs
- Database query performance
- Error rates by category
- User session duration
- Feature usage statistics

**Alerting Thresholds**:
- Error rate > 5% for 5 minutes
- API latency p95 > 500ms for 5 minutes
- Database connection pool exhausted
- AI API rate limit approaching
- Disk space < 20%
- Memory usage > 85%

**Logging**:
- Structured JSON logs
- Centralized log aggregation (e.g., ELK stack, Datadog)
- Log retention: 30 days
- Sensitive data redaction

## Development Phases

### Phase 1: Foundation (Weeks 1-2)
- Project setup and infrastructure
- Database schema and migrations
- Authentication system
- Basic terminal UI
- Command parser

### Phase 2: Core Features (Weeks 3-5)
- Message board (threads and messages)
- Real-time chat (WebSocket)
- Basic ghost engine (state machine and triggers)
- Mailbox system

### Phase 3: AI Integration (Weeks 6-7)
- OpenAI API integration
- Séance Lab (persona creation)
- Vector DB setup
- Ghost message generation

### Phase 4: Advanced Features (Weeks 8-10)
- File Graveyard (burial and resurrection)
- Corruption Engine
- Door Games engine
- Visual and audio effects

### Phase 5: Polish & Mystery (Weeks 11-12)
- Sysop Room and puzzles
- Hidden threads and narrative
- Ghost event scheduling
- Atmospheric refinements

### Phase 6: Testing & Launch (Weeks 13-14)
- Comprehensive testing
- Performance optimization
- Security hardening
- Documentation
- Deployment and monitoring

## Future Enhancements

### Post-Launch Features
- **Multiple Ghost Personas**: Allow users to create and switch between multiple personal ghosts
- **Ghost Trading**: Users can share ghost personas with others
- **Collaborative Séances**: Multiple users summon a shared ghost
- **Advanced Door Games**: More complex narratives with branching paths
- **User-Generated Content**: Allow users to create custom Door Games
- **Mobile Terminal App**: Native mobile experience
- **Voice Integration**: Voice commands and ghost voice responses
- **AR Elements**: Augmented reality ghost manifestations
- **Persistent World Events**: Server-wide narrative events affecting all users
- **Ghost Reputation System**: Ghosts gain power based on user interactions

### Technical Improvements
- **Horizontal Scaling**: Multi-instance backend with load balancing
- **Caching Layer**: Redis caching for frequently accessed data
- **CDN Integration**: Global content delivery for static assets
- **Advanced AI**: Fine-tuned models for better ghost personalities
- **Real-time Analytics**: Live dashboard for system monitoring
- **A/B Testing Framework**: Experiment with different ghost behaviors
- **Internationalization**: Multi-language support
- **Accessibility**: Screen reader support, keyboard navigation

## Conclusion

WRAITHNET represents a unique fusion of retro computing nostalgia, modern AI capabilities, and horror storytelling. The architecture prioritizes immersion, real-time responsiveness, and intelligent ghost behavior while maintaining scalability and security. By following this design, the implementation will deliver a compelling, haunted digital experience that resurrects the BBS era with a supernatural twist.

The property-based testing approach ensures correctness across a wide range of inputs and scenarios, while the modular architecture allows for iterative development and future enhancements. The ghost engine's flexibility enables rich, unpredictable interactions that will keep users engaged and unsettled.

This design provides a solid foundation for building WRAITHNET from scratch to production, with clear component boundaries, well-defined interfaces, and comprehensive testing strategies.
