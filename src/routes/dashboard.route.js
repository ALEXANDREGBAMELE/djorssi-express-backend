// src/routes/dashboard.route.js
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../../config/permissions');

router.use(authenticate);

// Dashboard DJ
router.get('/dj', 
  requireRole(['djorssi']),
  dashboardController.getDjDashboard
);

// Dashboard Employeur
router.get('/employeur',
  requireRole(['employeur']),
  dashboardController.getEmployeurDashboard
);

// Dashboard Admin
router.get('/admin',
  requireRole(['admin']),
  dashboardController.getAdminDashboard
);

// KPI en temps réel
router.get('/kpi/:type',
  dashboardController.getRealtimeKPI
);

// Activité récente
router.get('/activity',
  dashboardController.getRecentActivity
);

module.exports = router;