const sequelize = require('./config/database');
const app = require('./app');
const env = require('./config/env');
const logger = require('./config/logger');

const { User } = require('./src/models');

// ✅ Utiliser le PORT de l'environnement ou fallback sur 5000
const PORT = process.env.PORT || env.port || 5000;

const start = async () => {
  try {
    // 1. Connexion à la base de données
    await sequelize.authenticate();
    logger.info('✅ Database connection established.');

    // 2. ✅ Synchronisation des modèles - TOUJOURS en production
    // { alter: true } met à jour les tables sans perdre les données
    // { force: true } recrée les tables (perd les données)
    await sequelize.sync({ alter: true });
    logger.info('✅ Database synchronized (tables created/updated)');

    // 3. Démarrage du serveur sur 0.0.0.0
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📍 Bound to 0.0.0.0:${PORT}`);
      logger.info(`🚀 Server running on http://localhost:${PORT}`);
      logger.info(`📚 API available at ${env.apiPrefix}`);
      logger.info(`🏥 Health check at /health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

start();