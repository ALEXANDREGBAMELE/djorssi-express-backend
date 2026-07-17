// src/middleware/cache.js
const CacheService = require('../services/cache.service');
const logger = require('../../config/logger');

/**
 * Middleware de cache pour les routes GET
 * @param {number} duration - Durée de cache en secondes
 * @param {Function} keyGenerator - Fonction pour générer une clé personnalisée
 */
const cacheMiddleware = (duration = 300, keyGenerator = null) => {
  return async (req, res, next) => {
    // Ne pas cacher en production si on a un paramètre de bypass
    if (req.query._nocache === 'true') {
      return next();
    }

    // Générer la clé de cache
    let key;
    if (keyGenerator) {
      key = keyGenerator(req);
    } else {
      // Clé par défaut : méthode + URL + user_id (si authentifié)
      const userId = req.user?.id || 'anonymous';
      key = `cache:${req.method}:${req.originalUrl}:${userId}`;
    }

    // Limiter la longueur de la clé
    if (key.length > 200) {
      key = key.substring(0, 200);
    }

    try {
      // Vérifier le cache
      const cachedData = await CacheService.get(key);
      if (cachedData) {
        logger.debug(`Cache HIT: ${key}`);
        return res.json(cachedData);
      }

      // Intercepter la réponse pour la mettre en cache
      const originalJson = res.json.bind(res);
      res.json = function(data) {
        if (res.statusCode === 200) {
          CacheService.set(key, data, duration)
            .then(() => logger.debug(`Cache SET: ${key}`))
            .catch(err => logger.error('Cache set error:', err));
        }
        originalJson(data);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error:', error);
      next();
    }
  };
};

// Middleware pour invalider le cache
const invalidateCache = (pattern) => {
  return async (req, res, next) => {
    try {
      if (pattern) {
        const count = await CacheService.delPattern(pattern);
        logger.info(`Cache invalidated: ${count} keys for pattern ${pattern}`);
      }
      next();
    } catch (error) {
      logger.error('Cache invalidation error:', error);
      next();
    }
  };
};

module.exports = { cacheMiddleware, invalidateCache };