// src/routes/profile.route.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../../config/permissions');

// Toutes les routes sont protégées
router.use(authenticate);

// Dashboard (adapté au rôle)
router.get('/dashboard', profileController.getDashboard);

// Profil
router.get('/me', profileController.getProfile);
router.put('/me', profileController.updateProfile);

// Routes avec permissions spécifiques
router.get('/permissions', (req, res) => {
  const permissions = require('../config/permissions');
  res.json({
    success: true,
    data: {
      role: req.user.user_type,
      permissions: permissions.getUserPermissions(req.user)
    }
  });
});

module.exports = router;