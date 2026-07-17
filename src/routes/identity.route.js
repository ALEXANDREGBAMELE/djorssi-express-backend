// src/routes/identity.route.js
const express = require('express');
const router = express.Router();
const identityController = require('../controllers/identity.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../../config/permissions');

// Routes utilisateur (protégées)
router.use(authenticate);

router.post('/submit', identityController.submitDocuments);
router.get('/my-documents', identityController.getMyDocuments);
router.get('/my-status', identityController.getMyVerificationStatus);

// Routes admin
router.get('/pending', requireRole(['admin']), identityController.getPendingVerifications);
router.post('/approve', requireRole(['admin']), identityController.approveVerification);
router.post('/reject', requireRole(['admin']), identityController.rejectVerification);
router.get('/user/:userId', requireRole(['admin']), identityController.getUserVerification);

module.exports = router;