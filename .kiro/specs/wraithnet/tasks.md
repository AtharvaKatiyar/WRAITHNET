# Implementation Plan

- [x] 1. Project Setup and Infrastructure
  - Initialize monorepo structure with frontend and backend workspaces
  - Set up Docker Compose for local development (PostgreSQL, Redis, Chroma, MinIO)
  - Configure TypeScript for both frontend and backend
  - Set up ESLint and Prettier for code quality
  - Initialize Git repository with .gitignore
  - Create environment variable templates (.env.example)
  - _Requirements: All (foundation for entire system)_

- [x] 2. Database Schema and Migrations
  - Design and implement PostgreSQL schema for User, Thread, Message, Grave, MailMessage, GameSession, SysopAccess tables
  - Set up database migration tool (e.g., Prisma, TypeORM, or Knex)
  - Create initial migration files
  - Write seed data for development and testing
  - _Requirements: 1.1, 2.1, 8.1, 9.1, 10.1, 11.1_

- [x] 3. Backend Core Setup
  - Initialize Node.js Express application
  - Set up middleware (CORS, body-parser, helmet for security)
  - Configure logging with Winston or Pino
  - Implement error handling middleware with in-character messages
  - Set up request validation with Joi or Zod
  - _Requirements: 20.1, 20.2_

- [ ] 4. Authentication System
- [x] 4.1 Implement user registration endpoint
  - Create POST /api/auth/register endpoint
  - Implement password hashing with bcrypt
  - Validate user input (username, email, password strength)
  - Store user in database
  - _Requirements: 1.1, 18.1_

- [x] 4.2 Write property test for password hashing
  - **Property 1: Password encryption on registration**
  - **Validates: Requirements 1.1**

- [x] 4.3 Implement user login endpoint
  - Create POST /api/auth/login endpoint
  - Verify credentials against database
  - Generate JWT token with user ID
  - Create session in Redis
  - _Requirements: 1.2_

- [x] 4.4 Write property test for valid login
  - **Property 2: Valid login establishes session**
  - **Validates: Requirements 1.2**

- [x] 4.5 Write property test for invalid credentials
  - **Property 4: Invalid credentials rejection**
  - **Validates: Requirements 1.4**

- [x] 4.6 Implement logout endpoint
  - Create POST /api/auth/logout endpoint
  - Invalidate session in Redis
  - Ensure data persistence before logout
  - _Requirements: 1.5_

- [x] 4.7 Write property test for logout persistence
  - **Property 5: Logout persistence**
  - **Validates: Requirements 1.5**

- [x] 4.8 Implement authentication middleware
  - Create middleware to validate JWT tokens
  - Attach user context to requests
  - Handle expired tokens with in-character errors
  - _Requirements: 18.3_

- [x] 4.9 Write property test for token validation
  - **Property 53: Authentication token validation**
  - **Validates: Requirements 18.3**

- [ ] 5. Frontend Terminal UI Foundation
- [x] 5.1 Initialize React application with Vite
  - Set up React 18 with TypeScript
  - Configure TailwindCSS for styling
  - Set up routing (if needed for different views)
  - _Requirements: 12.1_

- [x] 5.2 Integrate xterm.js terminal emulator
  - Install and configure xterm.js
  - Create Terminal component wrapper
  - Implement basic input/output rendering
  - Style terminal with retro aesthetics (monospace font, green/amber text, CRT effects)
  - _Requirements: 12.1, 12.4_

- [x] 5.3 Implement command parser
  - Create command parsing logic (split input into command and arguments)
  - Define command registry with available commands
  - Implement command routing to handlers
  - Handle invalid commands with suggestions
  - _Requirements: 12.1, 12.2_

- [x] 5.4 Write property test for command parsing
  - **Property 40: Valid command execution**
  - **Property 41: Invalid command error handling**
  - **Validates: Requirements 12.1, 12.2**

- [x] 5.5 Implement authentication UI flow
  - Create login command handler
  - Create register command handler
  - Display welcome screen on successful login
  - Store JWT token in localStorage
  - _Requirements: 1.1, 1.2_

- [ ] 6. Message Board Backend
- [x] 6.1 Implement thread management endpoints
  - Create GET /api/boards/threads endpoint (list all threads)
  - Create GET /api/boards/threads/:id endpoint (get single thread with messages)
  - Create POST /api/boards/threads endpoint (create new thread)
  - Implement pagination for thread listing
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 6.2 Write property test for thread display
  - **Property 6: Thread display completeness**
  - **Validates: Requirements 2.1**

- [x] 6.3 Write property test for thread creation
  - **Property 8: Thread creation persistence**
  - **Validates: Requirements 2.3**

- [x] 6.4 Implement message management endpoints
  - Create POST /api/boards/threads/:id/messages endpoint (reply to thread)
  - Create GET /api/boards/threads/:id/messages endpoint (get thread messages)
  - Update thread timestamp on new message
  - _Requirements: 2.4_

- [x] 6.5 Write property test for message ordering
  - **Property 7: Message chronological ordering**
  - **Validates: Requirements 2.2**

- [x] 6.6 Write property test for reply appending
  - **Property 9: Reply appending**
  - **Validates: Requirements 2.4**

- [x] 6.7 Implement reply history endpoint
  - Create GET /api/boards/replies endpoint (get user's reply history)
  - Return all threads user has replied to with message IDs
  - Include thread metadata and reply content
  - _Requirements: 2.6_

- [x] 6.8 Write property test for reply history
  - **Property 67: Reply history completeness**
  - **Validates: Requirements 2.6**

- [x] 6.9 Implement reply deletion endpoint
  - Create DELETE /api/boards/messages/:messageId endpoint
  - Verify user owns the message before deletion
  - Remove message from thread
  - Update thread timestamp to most recent remaining message
  - _Requirements: 2.7_

- [x] 6.10 Write property test for reply deletion
  - **Property 68: Reply deletion removes message**
  - **Validates: Requirements 2.7**

- [ ] 7. Message Board Frontend
- [x] 7.1 Implement board command to list threads
  - Create command handler for "board" or "threads"
  - Fetch threads from API
  - Display threads in terminal with formatting (ID, title, author, date)
  - _Requirements: 2.1_

- [x] 7.2 Implement thread viewing command
  - Create command handler for "read <thread_id>"
  - Fetch thread messages from API
  - Display messages in chronological order with author and timestamp
  - _Requirements: 2.2_

- [x] 7.3 Implement thread creation command
  - Create command handler for "post <title>"
  - Prompt user for message content
  - Send POST request to create thread
  - Display success message
  - _Requirements: 2.3_

- [x] 7.4 Implement reply command
  - Create command handler for "reply <thread_id>"
  - Prompt user for message content
  - Send POST request to add message
  - Display success message
  - _Requirements: 2.4_

- [x] 7.5 Implement replied command
  - Create command handler for "replied"
  - Fetch user's reply history from API
  - Display threads with reply message IDs in terminal
  - Format output to show thread title, thread ID, reply content, and message ID
  - _Requirements: 2.6_

- [x] 7.6 Implement delete-reply command
  - Create command handler for "delete-reply <message_id>"
  - Send DELETE request to remove reply
  - Display success or error message
  - Handle authorization errors (user doesn't own the reply)
  - _Requirements: 2.7_

- [ ] 8. WebSocket Infrastructure
- [ ] 8.1 Set up Socket.io on backend
  - Install and configure Socket.io
  - Implement WebSocket authentication (validate JWT on connection)
  - Create connection/disconnection handlers
  - Set up room management for Whisper Room
  - _Requirements: 4.1, 13.1_

- [ ] 8.2 Write property test for WebSocket connection
  - **Property 15: Chat message broadcast**
  - **Validates: Requirements 4.2**

- [ ] 8.3 Implement presence tracking
  - Store connected users in Redis with timestamps
  - Broadcast join/leave events to all users
  - Implement heartbeat mechanism for connection health
  - _Requirements: 4.3, 4.4_

- [ ] 8.4 Write property test for presence tracking
  - **Property 16: Presence tracking**
  - **Validates: Requirements 4.3, 4.4**

- [ ] 8.5 Set up Socket.io client on frontend
  - Install Socket.io client
  - Create WebSocket manager component
  - Implement connection with JWT authentication
  - Handle reconnection with exponential backoff
  - _Requirements: 13.1, 13.3_

- [ ] 8.6 Write property test for reconnection
  - **Property 17: WebSocket reconnection**
  - **Validates: Requirements 13.3**

- [ ] 9. Whisper Room (Real-Time Chat)
- [ ] 9.1 Implement chat message handling on backend
  - Create socket event handler for "chat:send"
  - Validate and sanitize message content
  - Broadcast message to all users in room
  - Store recent messages in Redis for history (last 50 messages)
  - _Requirements: 4.2, 18.4_

- [ ] 9.2 Write property test for input sanitization
  - **Property 54: Input sanitization**
  - **Validates: Requirements 18.4**

- [ ] 9.3 Write property test for broadcast reliability
  - **Property 18: Broadcast reliability**
  - **Validates: Requirements 13.4**

- [ ] 9.4 Implement chat history endpoint
  - Create GET /api/chat/history endpoint
  - Return last 50 messages from Redis
  - Include user information for each message
  - _Requirements: 4.1_

- [ ] 9.5 Implement Whisper Room frontend
  - Create "chat" command to enter Whisper Room
  - Display chat history on entry
  - Show user presence list
  - Handle incoming messages and display in real-time
  - Implement message input and send via WebSocket
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 10. Ghost Engine Core
- [ ] 10.1 Implement Ghost State Machine
  - Create GhostState model in Redis
  - Implement mode transitions (Whisperer, Poltergeist, Trickster, Demon)
  - Store current mode, intensity, and trigger history
  - Create state persistence and retrieval functions
  - _Requirements: 5.1, 14.3_

- [ ] 10.2 Write property test for ghost state synchronization
  - **Property 45: Ghost state synchronization**
  - **Validates: Requirements 14.3**

- [ ] 10.3 Implement trigger system
  - Create trigger evaluation engine
  - Implement keyword trigger detection
  - Implement silence trigger (track last message time)
  - Implement sentiment analysis trigger (use simple sentiment library)
  - Create trigger priority and sequencing logic
  - _Requirements: 5.1, 5.2, 5.3, 17.2, 17.4_

- [ ] 10.4 Write property test for keyword triggers
  - **Property 11: Keyword trigger mode transition**
  - **Validates: Requirements 5.1**

- [ ] 10.5 Write property test for silence triggers
  - **Property 12: Silence trigger activation**
  - **Validates: Requirements 5.2**

- [ ] 10.6 Write property test for event sequencing
  - **Property 14: Ghost event sequencing**
  - **Validates: Requirements 3.5, 17.4**

- [ ] 10.7 Implement ghost event scheduler
  - Create cron job system for time-based events
  - Implement event queue for scheduled interventions
  - Create event execution handlers
  - _Requirements: 17.1_

- [ ] 10.8 Write property test for scheduled events
  - **Property 57: Service failure fallback**
  - **Validates: Requirements 20.3**

- [ ] 11. AI Integration Setup
- [ ] 11.1 Set up OpenAI API client
  - Install OpenAI SDK
  - Configure API key from environment variables
  - Implement rate limiting and request queuing
  - Create error handling with fallback behavior
  - _Requirements: 15.1, 20.3, 20.4_

- [ ] 11.2 Write property test for AI fallback
  - **Property 58: AI unavailability fallback**
  - **Validates: Requirements 20.4**

- [ ] 11.3 Implement ghost message generation
  - Create prompt templates for each ghost mode
  - Implement AI query function with context and personality
  - Validate and sanitize AI responses
  - Cache common responses for fallback
  - _Requirements: 15.1, 15.4, 15.5_

- [ ] 11.4 Write property test for AI context inclusion
  - **Property 47: AI context inclusion**
  - **Validates: Requirements 15.1**

- [ ] 11.5 Write property test for prompt adjustment
  - **Property 50: Prompt adjustment on mode change**
  - **Validates: Requirements 15.4**

- [ ] 11.6 Write property test for response validation
  - **Property 51: Response validation**
  - **Validates: Requirements 15.5**

- [ ] 11.7 Implement mode-specific message generation
  - Create Whisperer mode prompt (subtle, cryptic)
  - Create Poltergeist mode prompt (aggressive, chaotic)
  - Create Trickster mode prompt (playful, misleading)
  - Create Demon mode prompt (threatening, intense)
  - _Requirements: 5.4, 5.5, 5.6, 5.7_

- [ ] 11.8 Write property test for mode-specific messages
  - **Property 13: Mode-specific message generation**
  - **Validates: Requirements 5.4, 5.5, 5.6, 5.7**

- [ ] 12. Ghost Chat Integration
- [ ] 12.1 Integrate ghost into Whisper Room
  - Connect ghost engine to chat WebSocket events
  - Implement ghost message injection into chat
  - Mark ghost messages with isGhost flag
  - Style ghost messages distinctly in frontend
  - _Requirements: 2.5, 3.4_

- [ ] 12.2 Write property test for ghost message marking
  - **Property 10: Ghost message marking**
  - **Validates: Requirements 2.5, 3.4**

- [ ] 12.3 Implement private whispers
  - Create socket event for private whispers
  - Send whisper only to targeted user
  - Style whispers distinctly in frontend
  - _Requirements: 6.4_

- [ ] 12.4 Write property test for private whispers
  - **Property 19: Private whisper targeting**
  - **Validates: Requirements 6.4**

- [ ] 13. Visual Corruption Effects
- [ ] 13.1 Implement Corruption Engine backend
  - Create text corruption functions (character substitution, zalgo, etc.)
  - Create corruption effect parameter generation
  - Implement corruption intensity levels
  - _Requirements: 3.2_

- [ ] 13.2 Implement visual effects on frontend
  - Create Canvas/WebGL glitch effect renderer
  - Implement screen shake effect
  - Implement flicker effect
  - Implement static overlay
  - Implement color shift effect
  - Implement scanline artifacts
  - _Requirements: 6.1, 6.2_

- [ ] 13.3 Connect ghost events to visual effects
  - Trigger effects on ghost interventions
  - Synchronize effects with ghost mode (Poltergeist = intense, Whisperer = subtle)
  - _Requirements: 6.1_

- [ ] 13.4 Write property test for effect triggering
  - **Property 61: Ghost intervention effects**
  - **Validates: Requirements 6.1**

- [ ] 14. Audio System
- [ ] 14.1 Set up Howler.js audio library
  - Install Howler.js
  - Create audio manager component
  - Load sound assets (whispers, static, typing, creaks, heartbeat, drones)
  - _Requirements: 6.3_

- [ ] 14.2 Implement audio playback functions
  - Create playSound function for one-shot sounds
  - Create playAmbient function for looping background
  - Implement volume control
  - Implement fade in/out
  - _Requirements: 6.3_

- [ ] 14.3 Connect audio to ghost events
  - Trigger audio cues on ghost interventions
  - Synchronize audio with visual effects
  - Match audio to ghost mode
  - _Requirements: 6.3_

- [ ] 14.4 Write property test for audio synchronization
  - **Property 63: Audio synchronization**
  - **Validates: Requirements 6.3**

- [ ] 15. Vector Database Setup
- [ ] 15.1 Set up Chroma vector database
  - Configure Chroma in Docker Compose
  - Create client connection in backend
  - Implement collection creation for persona memories
  - _Requirements: 7.2_

- [ ] 15.2 Implement embedding generation
  - Create function to generate embeddings using OpenAI API
  - Implement text chunking for large uploads
  - Store embeddings with metadata in Chroma
  - _Requirements: 7.1, 15.2_

- [ ] 15.3 Write property test for embedding storage
  - **Property 48: Embedding generation and storage**
  - **Validates: Requirements 15.2**

- [ ] 15.4 Implement semantic search
  - Create function to query Chroma with embedding
  - Retrieve top-k relevant memories
  - Format memories for AI context
  - _Requirements: 15.3_

- [ ] 15.5 Write property test for memory retrieval
  - **Property 49: Memory retrieval for context**
  - **Validates: Requirements 15.3**

- [ ] 16. Séance Lab Backend
- [ ] 16.1 Implement text upload endpoint
  - Create POST /api/seance/upload endpoint
  - Accept text content from user
  - Generate embeddings and store in Vector DB
  - Create or update persona record
  - _Requirements: 7.1, 7.4_

- [ ] 16.2 Write property test for persona creation
  - **Property 20: Persona creation from text**
  - **Validates: Requirements 7.1, 7.2**

- [ ] 16.3 Write property test for persona evolution
  - **Property 22: Persona evolution**
  - **Validates: Requirements 7.4**

- [ ] 16.4 Implement chat endpoint
  - Create POST /api/seance/chat endpoint
  - Retrieve relevant memories from Vector DB
  - Generate AI response with persona context
  - Store conversation in database
  - _Requirements: 7.3_

- [ ] 16.5 Write property test for style-matched responses
  - **Property 23: Style-matched responses**
  - **Validates: Requirements 7.3**

- [ ] 16.6 Implement persona retrieval endpoint
  - Create GET /api/seance/ghost endpoint
  - Return persona information and conversation history
  - _Requirements: 7.5_

- [ ] 16.7 Write property test for persona persistence
  - **Property 21: Persona round-trip**
  - **Validates: Requirements 7.5**

- [ ] 16.8 Implement system ghost intrusion
  - Create random intrusion trigger
  - Inject global lore messages during séances
  - Connect to broader narrative
  - _Requirements: 7.6_

- [ ] 17. Séance Lab Frontend
- [ ] 17.1 Implement séance command
  - Create "seance" command to enter Séance Lab
  - Display séance interface with instructions
  - _Requirements: 7.1_

- [ ] 17.2 Implement text upload command
  - Create "upload" command to submit text
  - Send text to backend API
  - Display confirmation and persona creation message
  - _Requirements: 7.1_

- [ ] 17.3 Implement séance chat interface
  - Create "speak <message>" command for conversing with ghost
  - Send message to backend API
  - Display ghost response with distinct styling
  - Maintain conversation history in terminal
  - _Requirements: 7.3_

- [ ] 18. File Storage Setup
- [ ] 18.1 Set up MinIO (S3-compatible storage)
  - Configure MinIO in Docker Compose
  - Create bucket for graveyard files
  - Set up access credentials
  - _Requirements: 8.1_

- [ ] 18.2 Implement file upload/download utilities
  - Create S3 client wrapper
  - Implement file upload function with encryption
  - Implement file download function with decryption
  - Handle errors gracefully
  - _Requirements: 16.1, 16.2, 16.5_

- [ ] 18.3 Write property test for file encryption
  - **Property 29: File encryption on burial**
  - **Validates: Requirements 16.1, 18.2**

- [ ] 19. File Graveyard Backend
- [ ] 19.1 Implement file burial endpoint
  - Create POST /api/graveyard/bury endpoint
  - Accept file upload with metadata
  - Encrypt and store file in S3
  - Generate epitaph using AI
  - Create grave record in database
  - _Requirements: 8.1_

- [ ] 19.2 Write property test for file burial
  - **Property 24: File burial storage**
  - **Validates: Requirements 8.1**

- [ ] 19.3 Implement graveyard listing endpoints
  - Create GET /api/graveyard/personal endpoint (user's graves)
  - Create GET /api/graveyard/communal endpoint (public graves)
  - Return graves with metadata and epitaphs
  - _Requirements: 8.2, 8.3_

- [ ] 19.4 Write property test for graveyard display
  - **Property 25: Graveyard display completeness**
  - **Property 26: Communal graveyard visibility**
  - **Validates: Requirements 8.2, 8.3**

- [ ] 19.5 Implement file resurrection endpoint
  - Create POST /api/graveyard/raise/:graveId endpoint
  - Retrieve file from S3
  - Determine corruption level randomly
  - Apply corruption if needed
  - Return file to user
  - Update grave record
  - _Requirements: 8.4, 8.5_

- [ ] 19.6 Write property test for resurrection
  - **Property 27: File resurrection retrieval**
  - **Validates: Requirements 8.4**

- [ ] 19.7 Write property test for corruption distribution
  - **Property 28: Corruption randomness distribution**
  - **Validates: Requirements 8.5**

- [ ] 19.8 Implement grave inspection endpoint
  - Create GET /api/graveyard/inspect/:graveId endpoint
  - Return epitaph, ghost comments, and metadata
  - _Requirements: 8.6_

- [ ] 19.9 Implement file corruption algorithms
  - Create text file corruption (character substitution, line shuffling)
  - Create image corruption (pixel manipulation, color shifts)
  - Create binary corruption (byte flipping, chunk reordering)
  - Implement corruption intensity levels
  - _Requirements: 16.3, 16.4_

- [ ] 19.10 Write property test for corruption
  - **Property 64: Corruption application**
  - **Validates: Requirements 16.3**

- [ ] 19.11 Write property test for format validity
  - **Property 65: Corrupted file format validity**
  - **Validates: Requirements 16.4**

- [ ] 20. File Graveyard Frontend
- [ ] 20.1 Implement graveyard commands
  - Create "graveyard" command to view personal graveyard
  - Create "communal" command to view communal graveyard
  - Display graves with formatting
  - _Requirements: 8.2, 8.3_

- [ ] 20.2 Implement bury command
  - Create "bury <file>" command
  - Prompt for public/private choice
  - Upload file to backend
  - Display epitaph and confirmation
  - _Requirements: 8.1_

- [ ] 20.3 Implement raise command
  - Create "raise <grave_id>" command
  - Request file from backend
  - Download and save file
  - Display resurrection message (intact/corrupted/transformed)
  - _Requirements: 8.4, 8.5_

- [ ] 20.4 Implement inspect command
  - Create "inspect <grave_id>" command
  - Fetch grave details from backend
  - Display epitaph, ghost comments, and metadata
  - _Requirements: 8.6_

- [ ] 21. Mailbox Backend
- [ ] 21.1 Implement mailbox endpoints
  - Create GET /api/mailbox endpoint (list all messages)
  - Create GET /api/mailbox/:id endpoint (get specific message)
  - Create PUT /api/mailbox/:id/read endpoint (mark as read)
  - Create DELETE /api/mailbox/:id endpoint (delete message)
  - _Requirements: 9.1, 9.7_

- [ ] 21.2 Write property test for mailbox ordering
  - **Property 30: Mailbox chronological ordering**
  - **Validates: Requirements 9.1**

- [ ] 21.3 Write property test for read status
  - **Property 32: Read status update**
  - **Validates: Requirements 9.7**

- [ ] 21.4 Implement message delivery system
  - Create sendMessage function for system messages
  - Implement message type handling (transcript, warning, alert, lore, puzzle)
  - Mark new messages as unread
  - Emit WebSocket notification on new message
  - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 21.5 Write property test for automatic delivery
  - **Property 31: Automatic message delivery**
  - **Validates: Requirements 9.2, 9.3, 9.4, 9.5, 9.6**

- [ ] 22. Mailbox Frontend
- [ ] 22.1 Implement mailbox command
  - Create "mail" or "mailbox" command
  - Fetch messages from backend
  - Display messages with type, subject, date, and read status
  - _Requirements: 9.1_

- [ ] 22.2 Implement read command
  - Create "read <message_id>" command
  - Fetch message content from backend
  - Mark as read
  - Display message with formatting
  - _Requirements: 9.7_

- [ ] 22.3 Implement mailbox notifications
  - Listen for WebSocket "mailbox:notification" events
  - Display subtle notification in terminal
  - Update unread count
  - _Requirements: 9.6_

- [ ] 23. Checkpoint - Ensure all tests pass
  - Run all unit tests
  - Run all property-based tests
  - Fix any failing tests
  - Verify core features work end-to-end
  - Ask user if questions arise


- [ ] 24. Sysop Room Backend
- [ ] 24.1 Implement Sysop Room access control
  - Create SysopAccess table and model
  - Implement access check function
  - Create middleware to protect Sysop endpoints
  - _Requirements: 10.1_

- [ ] 24.2 Write property test for unauthorized access
  - **Property 33: Unauthorized access denial**
  - **Validates: Requirements 10.1**

- [ ] 24.3 Implement puzzle unlock system
  - Create POST /api/sysop/unlock endpoint
  - Validate puzzle solution
  - Grant access to user
  - Send mailbox notification
  - _Requirements: 10.2_

- [ ] 24.4 Write property test for puzzle unlock
  - **Property 34: Puzzle unlock**
  - **Validates: Requirements 10.2**

- [ ] 24.5 Implement Sysop Room endpoints
  - Create GET /api/sysop/status endpoint (check access)
  - Create GET /api/sysop/logs endpoint (corrupted system logs)
  - Create GET /api/sysop/threads endpoint (hidden threads)
  - Create POST /api/sysop/command endpoint (dangerous commands)
  - _Requirements: 10.3, 10.4, 10.5_

- [ ] 24.6 Implement hidden thread system
  - Create HiddenThread table and model
  - Implement unlock condition evaluation
  - Reveal threads when conditions met
  - _Requirements: 3.3, 10.4_

- [ ] 24.7 Write property test for thread revelation
  - **Property 35: Hidden thread revelation**
  - **Validates: Requirements 3.3, 10.4**

- [ ] 25. Sysop Room Frontend
- [ ] 25.1 Implement sysop command
  - Create "sysop" command to attempt access
  - Display locked message if unauthorized
  - Display Sysop interface if authorized
  - _Requirements: 10.1, 10.3_

- [ ] 25.2 Implement puzzle solving interface
  - Create "unlock <solution>" command
  - Send solution to backend
  - Display success/failure message
  - _Requirements: 10.2_

- [ ] 25.3 Implement Sysop Room features
  - Create "logs" command to view corrupted logs
  - Create "hidden" command to view hidden threads
  - Create "execute <command>" for dangerous commands
  - Apply unstable visual effects when in Sysop Room
  - _Requirements: 10.3, 10.4, 10.5, 10.6_

- [ ] 26. Door Games Engine Backend
- [ ] 26.1 Design game data structure
  - Create Game, Scene, Choice models
  - Define game JSON format
  - Create game loader function
  - _Requirements: 11.1, 11.2_

- [ ] 26.2 Implement game session management
  - Create GameSession table and model
  - Create POST /api/games/:gameId/start endpoint (initialize session)
  - Create GET /api/games/:gameId/state endpoint (get current state)
  - Create POST /api/games/:gameId/save endpoint (save progress)
  - _Requirements: 11.2, 11.6_

- [ ] 26.3 Write property test for game initialization
  - **Property 36: Game initialization**
  - **Validates: Requirements 11.2**

- [ ] 26.4 Write property test for progress persistence
  - **Property 38: Game progress persistence**
  - **Validates: Requirements 11.6**

- [ ] 26.5 Implement choice processing
  - Create POST /api/games/:gameId/choice endpoint
  - Validate choice against current scene
  - Update game state and transition to next scene
  - Handle branching logic
  - _Requirements: 11.3_

- [ ] 26.6 Write property test for choice branching
  - **Property 37: Choice branching**
  - **Validates: Requirements 11.3**

- [ ] 26.7 Implement game listing endpoint
  - Create GET /api/games endpoint
  - Return available games with descriptions
  - Include lock status and unlock requirements
  - _Requirements: 11.1, 11.7_

- [ ] 26.8 Write property test for locked game enforcement
  - **Property 39: Locked game enforcement**
  - **Validates: Requirements 11.7**

- [ ] 26.9 Implement ghost takeover system
  - Create random takeover trigger during gameplay
  - Inject ghost intervention into narrative
  - Modify scene text or add ghost messages
  - _Requirements: 11.5_

- [ ] 27. Door Games Content Creation
- [ ] 27.1 Create "Abandoned Hospital" game
  - Write narrative scenes with branching choices
  - Include ASCII art for key moments
  - Define ghost takeover points
  - Create game JSON file
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 27.2 Create "EVP Static Room" game
  - Write narrative with audio-focused horror
  - Include static decoding puzzles
  - Define ghost takeover points
  - Create game JSON file
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 27.3 Create "Ouija Terminal" game
  - Write narrative with spirit communication
  - Include choice-based dialogue
  - Define ghost takeover points
  - Create game JSON file
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 27.4 Create "Catacombs Maze" game
  - Write narrative with navigation puzzles
  - Include ASCII map
  - Define ghost takeover points
  - Create game JSON file
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 27.5 Create "The Last Transmission" game (locked)
  - Write finale narrative with major revelations
  - Include complex branching
  - Define unlock condition (complete other games + Sysop access)
  - Create game JSON file
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.7_

- [ ] 28. Door Games Frontend
- [ ] 28.1 Implement games command
  - Create "games" command to list available games
  - Display game titles, descriptions, and lock status
  - _Requirements: 11.1_

- [ ] 28.2 Implement game start command
  - Create "play <game_id>" command
  - Check if game is locked
  - Initialize game session
  - Display opening narrative
  - _Requirements: 11.2, 11.7_

- [ ] 28.3 Implement game choice interface
  - Display current scene text and ASCII art
  - Display available choices
  - Create "choose <choice_number>" command
  - Send choice to backend and display next scene
  - _Requirements: 11.3, 11.4_

- [ ] 28.4 Implement game exit command
  - Create "exit" command to leave game
  - Save progress
  - Return to main terminal
  - _Requirements: 11.6_

- [ ] 28.5 Implement ghost takeover rendering
  - Listen for ghost takeover events
  - Display ghost intervention with effects
  - Continue game after intervention
  - _Requirements: 11.5_

- [ ] 29. Ghost Message Board Integration
- [ ] 29.1 Implement ghost message injection
  - Connect ghost engine to message board
  - Randomly inject ghost messages into threads
  - Mark messages as ghost-authored
  - _Requirements: 3.1_

- [ ] 29.2 Implement thread corruption
  - Create corruption trigger in ghost engine
  - Apply text corruption to existing messages
  - Update messages in database
  - _Requirements: 3.2_

- [ ] 29.3 Implement hidden thread unlocking
  - Connect narrative progression to hidden threads
  - Unlock threads when conditions met
  - Send mailbox notification to users
  - _Requirements: 3.3_

- [ ] 30. Navigation and Help System
- [ ] 30.1 Implement help command
  - Create "help" command
  - Display available commands with descriptions
  - Organize by category (board, chat, séance, graveyard, games, sysop)
  - _Requirements: 12.3_

- [ ] 30.2 Implement navigation commands
  - Create "home" or "main" command to return to main menu
  - Create "back" command for context-aware navigation
  - Maintain navigation history
  - _Requirements: 12.6_

- [ ] 30.3 Write property test for navigation
  - **Property 42: Navigation consistency**
  - **Validates: Requirements 12.6**

- [ ] 30.4 Implement welcome screen
  - Display ASCII art logo on login
  - Show brief introduction to WRAITHNET
  - Display hint to type "help" for commands
  - _Requirements: 12.1_

- [ ] 31. Data Persistence and Session Management
- [ ] 31.1 Implement session data loading
  - Load user data on login (threads, messages, graves, personas, game sessions)
  - Cache frequently accessed data in Redis
  - _Requirements: 1.3, 14.2_

- [ ] 31.2 Write property test for session data completeness
  - **Property 3: Session data completeness**
  - **Validates: Requirements 1.3**

- [ ] 31.3 Write property test for complete data retrieval
  - **Property 44: Complete data retrieval on login**
  - **Validates: Requirements 14.2**

- [ ] 31.4 Implement immediate data persistence
  - Persist data changes immediately on user actions
  - Use database transactions for consistency
  - _Requirements: 14.1_

- [ ] 31.5 Write property test for immediate persistence
  - **Property 43: Immediate data persistence**
  - **Validates: Requirements 14.1**

- [ ] 31.6 Implement dual storage consistency
  - Ensure graveyard operations update both database and file storage
  - Use transactions or compensating actions for consistency
  - _Requirements: 14.5_

- [ ] 31.7 Write property test for dual storage
  - **Property 46: Dual storage consistency**
  - **Validates: Requirements 14.5**

- [ ] 32. Error Handling and Logging
- [ ] 32.1 Implement comprehensive error logging
  - Log all errors with timestamp, user context, and stack trace
  - Use structured logging format (JSON)
  - Configure log levels (error, warn, info)
  - _Requirements: 20.1_

- [ ] 32.2 Write property test for error logging
  - **Property 55: Error logging**
  - **Validates: Requirements 20.1**

- [ ] 32.3 Implement in-character error messages
  - Create error message templates for each error type
  - Use atmospheric language for user-facing errors
  - Maintain horror theme in error handling
  - _Requirements: 20.2_

- [ ] 32.4 Write property test for in-character errors
  - **Property 56: In-character error messages**
  - **Validates: Requirements 20.2**

- [ ] 32.5 Implement service failure handling
  - Add retry logic with exponential backoff
  - Implement circuit breaker pattern for external services
  - Provide fallback behavior when services unavailable
  - _Requirements: 20.3_

- [ ] 32.6 Write property test for service fallback
  - **Property 57: Service failure fallback**
  - **Validates: Requirements 20.3**

- [ ] 32.7 Implement data integrity protection
  - Use database transactions for critical operations
  - Implement rollback on errors
  - Validate data before persistence
  - _Requirements: 20.5_

- [ ] 32.8 Write property test for data integrity
  - **Property 59: Data integrity on critical errors**
  - **Validates: Requirements 20.5**

- [ ] 33. Security Hardening
- [ ] 33.1 Implement input sanitization
  - Sanitize all user input to prevent injection attacks
  - Use parameterized queries for database
  - Escape HTML/JavaScript in output
  - _Requirements: 18.4_

- [ ] 33.2 Implement rate limiting
  - Add rate limiting middleware to API endpoints
  - Limit WebSocket message frequency
  - Limit AI API requests per user
  - _Requirements: 19.4_

- [ ] 33.3 Implement HTTPS and security headers
  - Configure HTTPS in production
  - Add security headers (helmet.js)
  - Implement CORS properly
  - _Requirements: 18.5_

- [ ] 33.4 Implement file upload validation
  - Validate file types and sizes
  - Scan for malicious content
  - Limit upload frequency per user
  - _Requirements: 16.5_

- [ ] 34. Performance Optimization
- [ ] 34.1 Implement database indexing
  - Add indexes on frequently queried columns
  - Optimize query performance
  - Use connection pooling
  - _Requirements: 14.4, 19.3_

- [ ] 34.2 Write property test for message board storage
  - **Property 66: Message board storage**
  - **Validates: Requirements 14.4**

- [ ] 34.3 Implement caching strategy
  - Cache frequently accessed data in Redis
  - Implement cache invalidation on updates
  - Cache AI responses for common queries
  - _Requirements: 19.5_

- [ ] 34.4 Optimize WebSocket performance
  - Implement message batching for broadcasts
  - Use binary protocols where appropriate
  - Optimize presence tracking
  - _Requirements: 13.2, 19.2_

- [ ] 34.5 Optimize frontend performance
  - Implement lazy loading for components
  - Optimize terminal rendering
  - Minimize bundle size
  - _Requirements: 19.1_

- [ ] 35. Testing and Quality Assurance
- [ ] 35.1 Write remaining unit tests
  - Test all service functions
  - Test all API endpoints
  - Test all command handlers
  - Achieve 80%+ code coverage

- [ ] 35.2 Write integration tests
  - Test complete user journeys
  - Test WebSocket communication
  - Test AI integration
  - Test file storage operations

- [ ] 35.3 Perform security testing
  - Run OWASP ZAP vulnerability scan
  - Test for SQL injection
  - Test for XSS vulnerabilities
  - Test authentication and authorization

- [ ] 35.4 Perform performance testing
  - Load test with 100 concurrent users
  - Measure API response times
  - Measure WebSocket latency
  - Identify and fix bottlenecks

- [ ] 36. Deployment Preparation
- [ ] 36.1 Create Docker images
  - Create Dockerfile for frontend
  - Create Dockerfile for backend
  - Optimize image sizes
  - _Requirements: All_

- [ ] 36.2 Set up production environment
  - Configure production database (PostgreSQL)
  - Configure production cache (Redis)
  - Configure production file storage (S3)
  - Configure production Vector DB (Pinecone or hosted Chroma)
  - _Requirements: All_

- [ ] 36.3 Set up CI/CD pipeline
  - Create GitHub Actions workflow
  - Implement automated testing
  - Implement automated deployment
  - Set up staging environment
  - _Requirements: All_

- [ ] 36.4 Configure monitoring and alerting
  - Set up application monitoring (e.g., Datadog, New Relic)
  - Configure error tracking (e.g., Sentry)
  - Set up log aggregation
  - Configure alerts for critical issues
  - _Requirements: 20.1_

- [ ] 37. Documentation
- [ ] 37.1 Write API documentation
  - Document all REST endpoints
  - Document WebSocket events
  - Include request/response examples
  - _Requirements: All_

- [ ] 37.2 Write user guide
  - Document all commands
  - Provide usage examples
  - Include troubleshooting section
  - _Requirements: 12.1, 12.3_

- [ ] 37.3 Write deployment guide
  - Document deployment process
  - Include environment variable configuration
  - Provide troubleshooting tips
  - _Requirements: All_

- [ ] 37.4 Write developer guide
  - Document architecture and design decisions
  - Provide setup instructions for local development
  - Include contribution guidelines
  - _Requirements: All_

- [ ] 38. Final Checkpoint - Production Readiness
  - Run all tests (unit, property, integration)
  - Verify all features work end-to-end
  - Check security hardening
  - Verify performance meets requirements
  - Review error handling and logging
  - Ensure documentation is complete
  - Ask user if ready for deployment
