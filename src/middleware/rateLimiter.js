// src/middleware/rateLimiter.js
const redis = require('../../config/redis');
const logger = require('../../config/logger');

/**
 * Rate Limiter basé sur Redis
 * @param {Object} options
 * @param {number} options.windowMs - Fenêtre de temps en millisecondes
 * @param {number} options.max - Nombre maximum de requêtes
 * @param {string} options.message - Message d'erreur
 * @param {Function} options.keyGenerator - Générateur de clé personnalisé
 */
const rateLimiter = (options = {}) => {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    message = 'Trop de requêtes, veuillez réessayer plus tard',
    keyGenerator = null
  } = options;

  return async (req, res, next) => {
    // Générer la clé
    let key;
    if (keyGenerator) {
      key = keyGenerator(req);
    } else {
      // Par défaut : IP + route
      const ip = req.ip || req.connection.remoteAddress;
      const route = req.route?.path || req.path;
      key = `ratelimit:${ip}:${route}`;
    }

    try {
      const current = await redis.incr(key);
      
      if (current === 1) {
        // Première requête, définir l'expiration
        await redis.expire(key, Math.ceil(windowMs / 1000));
      }

      // Ajouter les headers de rate limit
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      
      const ttl = await redis.ttl(key);
      res.setHeader('X-RateLimit-Reset', new Date(Date.now() + ttl * 1000).toISOString());

      if (current > max) {
        return res.status(429).json({
          success: false,
          message,
          retryAfter: Math.ceil(ttl / 60)
        });
      }

      next();
    } catch (error) {
      logger.error('Rate limiter error:', error);
      // En cas d'erreur Redis, on laisse passer
      next();
    }
  };
};

// Rate limiters prédéfinis
const rateLimiters = {
  // Limite stricte pour le login
  login: rateLimiter({
    windowMs: 60000, // 1 minute
    max: 5,
    message: 'Trop de tentatives de connexion. Réessayez dans 5 minutes.',
    keyGenerator: (req) => {
      const ip = req.ip || req.connection.remoteAddress;
      return `ratelimit:login:${ip}`;
    }
  }),

  // Limite pour les inscriptions
  register: rateLimiter({
    windowMs: 3600000, // 1 heure
    max: 10,
    message: 'Trop de tentatives d\'inscription. Réessayez plus tard.'
  }),

  // Limite pour les API publiques
  public: rateLimiter({
    windowMs: 60000, // 1 minute
    max: 60,
    message: 'Trop de requêtes. Réessayez dans 1 minute.'
  }),

  // Limite pour les API authentifiées
  authenticated: rateLimiter({
    windowMs: 60000, // 1 minute
    max: 120,
    message: 'Trop de requêtes. Réessayez dans 1 minute.'
  }),

  // Limite pour la soumission de documents
  documentUpload: rateLimiter({
    windowMs: 3600000, // 1 heure
    max: 5,
    message: 'Trop de tentatives de soumission de documents. Réessayez dans 1 heure.'
  })
};

module.exports = { rateLimiter, rateLimiters };