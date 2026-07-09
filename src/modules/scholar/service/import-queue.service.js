const importRepository = require('../repository/import.repository');
const importLogRepository = require('../repository/import-log.repository');
const logger = require('../../../common/logger/winston');

class ImportQueueService {
  constructor() {
    this.isProcessing = false;
    this.workerInterval = null;
    // We defer importing scholarService to avoid circular dependency
    this.scholarService = null;
  }

  // Set the scholar service reference
  setScholarService(scholarService) {
    this.scholarService = scholarService;
  }

  /**
   * Log message to the database import logs collection
   */
  async log(importId, userId, message, level = 'info') {
    logger.info(`[ImportJob:${importId}] [${level.toUpperCase()}] ${message}`);
    try {
      await importLogRepository.create({
        importId,
        userId,
        level,
        message,
        timestamp: new Date()
      });
    } catch (err) {
      logger.error(`Failed to write import log: ${err.message}`);
    }
  }

  /**
   * Enqueue a new import job
   */
  async enqueue(userId, provider = 'google_scholar', metadata = {}) {
    // If there is already an active job (pending or running), return it
    const activeJob = await importRepository.findActiveImportByUserId(userId, provider);
    if (activeJob) {
      logger.info(`Job already active for user ${userId}, provider ${provider}`);
      return activeJob;
    }

    const job = await importRepository.create({
      userId,
      provider,
      status: 'pending',
      progress: 0,
      retryCount: 0,
      metadata
    });

    await this.log(job._id, userId, `Enqueued import job for provider: ${provider}`);
    
    // Trigger worker immediately
    this.processNextJob();

    return job;
  }

  /**
   * Core worker: picks the next pending job atomically and processes it
   */
  async processNextJob() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Find next pending job and atomically update it to 'running'
      const job = await importRepository.model.findOneAndUpdate(
        { status: 'pending' },
        { 
          $set: { 
            status: 'running', 
            lastAttemptAt: new Date() 
          } 
        },
        { new: true, sort: { createdAt: 1 } }
      );

      if (!job) {
        this.isProcessing = false;
        return;
      }

      await this.log(job._id, job.userId, `Started processing job for user: ${job.userId}. Attempt: ${job.retryCount + 1}`);

      try {
        if (!this.scholarService) {
          this.scholarService = require('./scholar.service');
        }

        // Run the actual import logic
        await this.scholarService.syncScholarData(job._id, job.userId, job.metadata.authorId);

        // Update job to completed
        job.status = 'completed';
        job.progress = 100;
        job.completedAt = new Date();
        await job.save();

        await this.log(job._id, job.userId, 'Import job completed successfully!', 'info');
      } catch (err) {
        logger.error(`Error processing import job ${job._id}: ${err.message}`, err);
        await this.log(job._id, job.userId, `Job failed: ${err.message} \n ${err.stack}`, 'error');

        // Increment retry count
        job.retryCount += 1;
        job.error = { message: err.message, stack: err.stack };

        if (job.retryCount >= 3) {
          job.status = 'failed';
          await this.log(job._id, job.userId, 'Max retries exceeded. Job marked as failed.', 'error');
        } else {
          job.status = 'pending'; // Re-enqueue for retry
          await this.log(job._id, job.userId, `Re-enqueued job for retry attempt ${job.retryCount + 1}`, 'warn');
        }
        
        await job.save();
      }

    } catch (err) {
      logger.error(`Queue worker execution error: ${err.message}`);
    } finally {
      this.isProcessing = false;
      // Immediately check if there are more pending jobs
      const nextPending = await importRepository.findNextPendingJob();
      if (nextPending) {
        setTimeout(() => this.processNextJob(), 100);
      }
    }
  }

  /**
   * Resume/cleanup interrupted jobs on startup (running/resume -> pending)
   */
  async resumeInterruptedJobs() {
    try {
      const interrupted = await importRepository.model.updateMany(
        { status: { $in: ['running', 'resume'] } },
        { 
          $set: { 
            status: 'pending',
            progress: 0
          } 
        }
      );
      if (interrupted.modifiedCount > 0) {
        logger.info(`Resumed ${interrupted.modifiedCount} interrupted Scholar import jobs.`);
      }
    } catch (err) {
      logger.error(`Error resuming interrupted jobs: ${err.message}`);
    }
  }

  /**
   * Start the background queue worker process
   */
  runQueueWorker() {
    if (this.workerInterval) return;

    logger.info('Initializing background Scholar import queue worker...');
    
    // Check and resume interrupted jobs on startup, then process next job
    this.resumeInterruptedJobs().then(() => {
      this.processNextJob();
    });

    // Poll database for pending jobs every 10 seconds
    this.workerInterval = setInterval(() => {
      this.processNextJob();
    }, 10000);
  }

  /**
   * Stop worker (for tests/shutdown)
   */
  stopQueueWorker() {
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = null;
    }
  }
}

module.exports = new ImportQueueService();
