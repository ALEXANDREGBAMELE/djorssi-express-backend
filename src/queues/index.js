// src/queues/index.js
const Queue = require('bull');
const redis = require('../../config/redis');
const logger = require('../../config/logger');

// Configuration Redis pour Bull
const redisConfig = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || null,
    db: parseInt(process.env.REDIS_DB) || 0,
  }
};

// File d'attente des notifications
const notificationQueue = new Queue('notifications', redisConfig);

// File d'attente des emails
const emailQueue = new Queue('emails', redisConfig);

// File d'attente des images
const imageQueue = new Queue('images', redisConfig);

// File d'attente des rapports
const reportQueue = new Queue('reports', redisConfig);

// Gestion des erreurs des queues
notificationQueue.on('error', (error) => {
  logger.error('Notification queue error:', error);
});

emailQueue.on('error', (error) => {
  logger.error('Email queue error:', error);
});

imageQueue.on('error', (error) => {
  logger.error('Image queue error:', error);
});

reportQueue.on('error', (error) => {
  logger.error('Report queue error:', error);
});

// Monitorer les queues
const monitorQueues = async () => {
  const queues = [notificationQueue, emailQueue, imageQueue, reportQueue];
  
  for (const queue of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);
    
    logger.debug(`Queue ${queue.name}: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}, delayed=${delayed}`);
  }
};

// Monitorer toutes les 30 secondes
if (process.env.NODE_ENV === 'development') {
  setInterval(monitorQueues, 30000);
}

module.exports = {
  notificationQueue,
  emailQueue,
  imageQueue,
  reportQueue,
  monitorQueues
};