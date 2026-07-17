// src/routes/candidature.route.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const candidatureController = require('../controllers/candidature.controller');
const { authenticate } = require('../middleware/auth');
const { requirePermission, requireRole } = require('../../config/permissions');

// Toutes les routes sont protégées
router.use(authenticate);

// ====================
// ROUTES DJ
// ====================
router.post('/postuler',
  requirePermission('mission.apply'),
  candidatureController.postuler
);

router.delete('/:id/annuler',
  candidatureController.annulerCandidature
);

// ====================
// ROUTES EMPLOYEUR
// ====================
router.get('/',
  candidatureController.getCandidaturesByMission
);

router.put('/:id/traiter',
  requirePermission('mission.manage_applications'),
  candidatureController.traiterCandidature
);

router.post('/:id/evaluer',
  requirePermission('mission.manage_applications'),
  candidatureController.evaluerDJ
);

router.post('/:id/paiement',
  requirePermission('mission.manage_applications'),
  candidatureController.enregistrerPaiement
);

// ====================
// PRÉ-SÉLECTION
// ====================
router.post('/:id/pre-selectionner',
  requirePermission('mission.manage_applications'),
  candidatureController.preSelectionner
);

// ====================
// ENTRETIEN
// ====================
router.post('/:id/entretien',
  requirePermission('mission.manage_applications'),
  candidatureController.planifierEntretien
);

router.put('/:id/entretien/:entretienId/confirmer',
  candidatureController.confirmerEntretien
);

router.put('/:id/entretien/terminer',
  requirePermission('mission.manage_applications'),
  candidatureController.terminerEntretien
);


// ====================
// ROUTES ADMIN
// ====================
router.get('/admin/all',
  requireRole(['admin']),
  candidatureController.adminGetAllCandidatures
);

router.get('/admin/:id',
  requireRole(['admin']),
  candidatureController.adminGetCandidatureById
);

module.exports = router;