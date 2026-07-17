const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const env = require('./config/env');
const logger = require('./config/logger');
const errorHandler = require('./src/middleware/errorHandler');

// Import des routes
const authRoutes = require('./src/routes/auth.route');
const userRoutes = require('./src/routes/user.route');
const missionRoutes = require('./src/routes/mission.route');
const profileRoutes = require('./src/routes/profile.route');
const candidatureRoutes = require('./src/routes/candidature.route');
const categoryRoutes = require('./src/routes/category.route');
const notificationRoutes = require('./src/routes/notification.route');
const avisRoutes = require('./src/routes/avis.route');
const paiementRoutes = require('./src/routes/paiement.route');
const identityRoutes = require('./src/routes/identity.route');
const messageRoutes = require('./src/routes/message.route');
const communicationRoutes = require('./src/routes/communication.route');
const dashboardRoutes = require('./src/routes/dashboard.route');
const reportingRoutes = require('./src/routes/reporting.route');


const app = express();

require('./config/redis'); // Initialiser Redis
require('./src/queues/processors'); // Initialiser les processeurs

// ========== MIDDLEWARES GLOBAUX ==========
app.use(cors({ 
  origin: env.corsOrigin || '*',
  credentials: true 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Morgan pour le logging en développement
if (env.nodeEnv === 'development') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// ========== ROUTES ==========
// Routes principales
app.use('/api/auth', authRoutes);        // Authentification
app.use('/api/users', userRoutes);       // Utilisateurs
app.use('/api/missions', missionRoutes); // Missions
app.use('/api/profile', profileRoutes);
app.use('/api/missions/:missionId/candidatures', candidatureRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/missions/:missionId/avis', avisRoutes);
app.use('/api/missions/:missionId/paiements', paiementRoutes);
app.use('/api/identity', identityRoutes);
app.use('/api/conversations', messageRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reporting', reportingRoutes);

// Route de test (Hello World)
app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello World ! 🚀',
    service: 'Djorssi Express API',
    version: '1.0.0'
  });
});

// ========== CHARGEMENT AUTOMATIQUE DES MODULES ==========
const modulesPath = path.join(__dirname, 'modules');
if (fs.existsSync(modulesPath)) {
  try {
    const moduleFolders = fs.readdirSync(modulesPath).filter(file => {
      return fs.statSync(path.join(modulesPath, file)).isDirectory();
    });

    moduleFolders.forEach(folder => {
      const routePath = path.join(modulesPath, folder, `${folder}.routes.js`);
      if (fs.existsSync(routePath)) {
        try {
          const route = require(routePath);
          app.use(`${env.apiPrefix || '/api'}/${folder}`, route);
          logger.info(`✅ Module chargé: /${folder}`);
        } catch (error) {
          logger.error(`❌ Erreur chargement module ${folder}:`, error.message);
        }
      }
    });
  } catch (error) {
    logger.error('❌ Erreur lecture du dossier modules:', error.message);
  }
}

// ========== ROUTE DE SANTÉ ==========
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    service: 'Djorssi Express',
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========== ROUTE 404 - Non trouvée ==========
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route non trouvée',
    path: req.originalUrl,
    method: req.method
  });
});

// ========== MIDDLEWARE DE GESTION D'ERREURS ==========
app.use(errorHandler);

module.exports = app;