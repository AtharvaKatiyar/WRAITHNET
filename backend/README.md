# WRAITHNET Backend

The haunted BBS system backend built with Node.js, Express, and TypeScript.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your `.env` file with appropriate values.

4. Run development server:
```bash
npm run dev
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm test` - Run tests

## Architecture

### Middleware Stack

1. **Helmet** - Security headers
2. **CORS** - Cross-origin resource sharing
3. **Body Parser** - JSON and URL-encoded request parsing
4. **Pino HTTP** - Request logging
5. **Error Handler** - Centralized error handling with in-character messages
6. **Validation** - Zod-based request validation

### Error Handling

All errors are caught by the centralized error handler which:
- Logs detailed error information
- Returns in-character error messages to maintain atmosphere
- Includes technical details for debugging

### Logging

Uses Pino for high-performance logging with pretty printing in development.

## API Endpoints

### Health Check
- `GET /health` - System status check

Additional endpoints will be added as features are implemented.
