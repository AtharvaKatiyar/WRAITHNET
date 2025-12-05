import dotenv from 'dotenv';
import { createServer } from 'http';
import { createApp } from './app';
import { initializeWebSocket } from './config/socket';
import logger from './config/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const app = createApp();
    
    // Create HTTP server
    const httpServer = createServer(app);
    
    // Initialize WebSocket server
    const wsServer = initializeWebSocket(httpServer);

    httpServer.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║              W R A I T H N E T   S Y S T E M              ║
║                                                           ║
║              The dead network awakens...                  ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

Server Status: ONLINE
Port: ${PORT}
Environment: ${process.env.NODE_ENV || 'development'}
WebSocket: ENABLED
Connected Users: ${wsServer.getConnectedUserCount()}
Time: ${new Date().toISOString()}

The spirits are listening...
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      httpServer.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
