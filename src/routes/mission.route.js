// src/routes/mission.route.js
const express = require('express');
const router = express.Router();
const missionController = require('../controllers/mission.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../../config/permissions');
const { cacheMiddleware, invalidateCache } = require('../middleware/cache');
const { rateLimiters } = require('../middleware/rateLimiter');
const { checkBlacklist } = require('../middleware/blacklist');

// Toutes les routes sont protégées
router.use(authenticate);
router.use(checkBlacklist);

// ====================
// ROUTES PUBLIQUES (tous les rôles)
// ====================
router.get('/getAll', 
  rateLimiters.public,
  cacheMiddleware(300), // 5 minutes
  missionController.getAllMissions
);

router.get('/getById/:id', 
  cacheMiddleware(300),
  missionController.getMissionById
);

// ====================
// ROUTES EMPLOYEUR
// ====================
router.post('/create', 
  rateLimiters.authenticated,
  requirePermission('mission.create'),
  invalidateCache('cache:*/api/missions*'),
  missionController.createMission
);

router.put('/update/:id', 
  rateLimiters.authenticated,
  requirePermission('mission.update'),
  invalidateCache('cache:*/api/missions*'),
  missionController.updateMission
);

router.delete('/delete/:id', 
  rateLimiters.authenticated,
  requirePermission('mission.delete'),
  invalidateCache('cache:*/api/missions*'),
  missionController.deleteMission
);

router.post('/publier/:id', 
  rateLimiters.authenticated,
  requirePermission('mission.update'),
  invalidateCache('cache:*/api/missions*'),
  missionController.publierMission
);

// ✅ Gestion des sélections de DJs (employeur)
router.post('/:id/selectionner-djs', 
  rateLimiters.authenticated,
  requirePermission('mission.manage_applications'),
  invalidateCache('cache:*/api/missions*'),
  missionController.selectionnerDJs
);

router.put('/:id/confirmer-dj', 
  rateLimiters.authenticated,
  requirePermission('mission.manage_applications'),
  invalidateCache('cache:*/api/missions*'),
  missionController.confirmerDJ
);

router.get('/:id/djs-selectionnes', 
  cacheMiddleware(120), // 2 minutes
  missionController.getDJsSelectionnes
);

// ====================
// ROUTES ADMIN
// ====================
router.get('/admin/all', 
  requireRole(['admin']),
  cacheMiddleware(120),
  missionController.adminGetAllMissions
);

module.exports = router;