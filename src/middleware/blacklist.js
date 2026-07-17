// src/middleware/blacklist.js
const redis = require('../../config/redis');
const jwt = require('jsonwebtoken');
const logger = require('../../config/logger');

class TokenBlacklist {
  // Ajouter un token à la blacklist
  static async blacklist(token, expiresIn = 86400) {
    try {
      // Décoder le token pour obtenir l'expiration
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = Math.max(decoded.exp - now, 60); // Minimum 1 minute
        await redis.set(`blacklist:${token}`, 'revoked', 'EX', ttl);
        return true;
      }
      // Si on ne peut pas décoder, utiliser la valeur par défaut
      await redis.set(`blacklist:${token}`, 'revoked', 'EX', expiresIn);
      return true;
    } catch (error) {
      logger.error('Token blacklist error:', error);
      return false;
    }
  }

  // Vérifier si un token est blacklisté
  static async isBlacklisted(token) {
    try {
      const result = await redis.get(`blacklist:${token}`);
      return result !== null;
    } catch (error) {
      logger.error('Token check error:', error);
      return false;
    }
  }

  // Vider la blacklist (admin)
  static async clearBlacklist() {
    try {
      const keys = await redis.keys('blacklist:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return keys.length;
    } catch (error) {
      logger.error('Clear blacklist error:', error);
      return 0;
    }
  }
}

// Middleware pour vérifier la blacklist
const checkBlacklist = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
  
  if (isBlacklisted) {
    return res.status(401).json({
      success: false,
      message: 'Token révoqué. Veuillez vous reconnecter.'
    });
  }

  next();
};

module.exports = { TokenBlacklist, checkBlacklist };