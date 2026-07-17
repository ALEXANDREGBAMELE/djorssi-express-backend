const sequelize = require('./config/database');
const app = require('./app');  // On importe l'application Express
const env = require('./config/env');
const logger = require('./config/logger');

const { User } = require('./src/models');
const start = async () => {
  try {
    // 1. Connexion à la base de données
    await sequelize.authenticate();
    logger.info('✅ Database connection established.');

    // 2. Synchronisation des modèles (uniquement en développement)
    if (env.nodeEnv === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('✅ Database synchronized.');
    }

    // 3. Démarrage du serveur
    app.listen(env.port, () => {
      logger.info(`🚀 Server running on http://localhost:${env.port}`);
      logger.info(`📚 API available at ${env.apiPrefix}`);
      logger.info(`🏥 Health check at /health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

start();