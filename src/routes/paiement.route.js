// src/routes/paiement.route.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const paiementController = require('../controllers/paiement.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', paiementController.createPaiement);
router.get('/', paiementController.getPaiementsByMission);

// Routes DJ
router.get('/dj/mes-paiements', paiementController.getPaiementsByDJ);

module.exports = router;