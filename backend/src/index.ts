import dotenv from 'dotenv';
import { createApp } from './app';
import logger from './config/logger';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    const app = createApp();

    app.listen(PORT, () => {
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
Time: ${new Date().toISOString()}

The spirits are listening...
      `);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error(error, 'Failed to start server');
    process.exit(1);
  }
};

startServer();
