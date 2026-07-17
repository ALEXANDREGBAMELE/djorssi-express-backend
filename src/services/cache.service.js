// services/cache.service.js
const redis = require('../../config/redis');
const logger = require('../../config/logger');

class CacheService {
  // Récupérer une valeur du cache
  static async get(key) {
    try {
      const data = await redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Cache get error:', error);
      return null;
    }
  }

  // Définir une valeur dans le cache
  static async set(key, value, ttl = parseInt(process.env.REDIS_CACHE_TTL) || 3600) {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      return false;
    }
  }

  // Supprimer du cache
  static async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache del error:', error);
      return false;
    }
  }

  // Supprimer par pattern
  static async delPattern(pattern) {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error('Cache delPattern error:', error);
      return 0;
    }
  }

  // Vérifier si une clé existe
  static async exists(key) {
    try {
      return await redis.exists(key);
    } catch (error) {
      logger.error('Cache exists error:', error);
      return false;
    }
  }

  // Incrémenter un compteur
  static async incr(key, by = 1) {
    try {
      return await redis.incrby(key, by);
    } catch (error) {
      logger.error('Cache incr error:', error);
      return null;
    }
  }

  // Obtenir le TTL restant
  static async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error('Cache ttl error:', error);
      return -1;
    }
  }
}

module.exports = CacheService;