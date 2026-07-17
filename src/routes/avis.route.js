// src/routes/avis.route.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const avisController = require('../controllers/avis.controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', avisController.createAvis);
router.get('/', avisController.getAvisByMission);
router.put('/:id/repondre', avisController.repondreAvis);

module.exports = router;