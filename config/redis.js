// config/redis.js
const Redis = require('ioredis');
const logger = require('./logger');

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: parseInt(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('connect', () => {
  logger.info('✅ Redis connecté avec succès');
});

redis.on('error', (err) => {
  logger.error('❌ Redis erreur:', err.message);
});

redis.on('close', () => {
  logger.warn('⚠️ Redis déconnecté');
});

redis.on('reconnecting', () => {
  logger.info('🔄 Redis tentative de reconnexion...');
});

module.exports = redis;