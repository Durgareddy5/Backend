const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const logger = require('./common/logger/winston');
const { connectDB, closeDB } = require('./config/database/connection');
const { syncDatabaseIndexes } = require('./config/database/indexes');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // 1. Establish Database Connection
    await connectDB();

    // 2. Express + Register Routes (loaded dynamically after DB connection)
    const app = require('./app');

    // 3. Start Express Listener
    const { Server } = require("socket.io");
    const server = app.listen(PORT, () => {
      logger.info(`Research Connect server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      
      // 4. Asynchronously spawn background tasks (Non-blocking)
      setImmediate(async () => {
        try {
          // Sync database indexes (skips automatically outside development)
          await syncDatabaseIndexes();
        } catch (err) {
          logger.error('Failed database index audit in background:', err);
        }

        try {
          // Scholar Queue Worker
          const importQueueService = require('./modules/scholar/service/import-queue.service');
          importQueueService.runQueueWorker();
        } catch (err) {
          logger.error('Failed to run Scholar queue worker in background:', err);
        }

        try {
          // Identity Sync Queue Worker
          const identitySyncQueueService = require('./modules/identity/service/identitySyncQueue.service');
          identitySyncQueueService.runQueueWorker();
        } catch (err) {
          logger.error('Failed to run Identity Sync queue worker in background:', err);
        }
        
        logger.info('Background workers initialized.');
      });
    });

    // 4. Initialize Socket.IO
    const { initSocket } = require('./config/socket');
    const io = initSocket(server);

    // Handle Graceful Shutdowns
    const shutdownGracefully = async (signal) => {
      logger.info(`Received ${signal}. Shutting down server gracefully...`);
      
      server.close(async () => {
        logger.info('HTTP server closed.');
        // Terminate db connection
        await closeDB();
        logger.info('Database connections closed. Exiting process.');
        process.exit(0);
      });

      // Force shutdown after 10s if graceful fails
      setTimeout(() => {
        logger.error('Forceful shutdown triggered.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
    process.on('SIGINT', () => shutdownGracefully('SIGINT'));

  } catch (error) {
    logger.error('Error starting Research Connect server:', error);
    process.exit(1);
  }
};

// Handle Uncaught Exception events
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception occurred:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();

// Nodemon reload trigger to connect cleanly after port release - updated
