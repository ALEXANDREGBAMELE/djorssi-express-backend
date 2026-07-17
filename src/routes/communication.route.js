// src/routes/communication.route.js
const express = require('express');
const router = express.Router();
const emailController = require('../controllers/email.controller');
const smsController = require('../controllers/sms.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../../config/permissions');

// Toutes les routes nécessitent authentification admin
router.use(authenticate);
router.use(requireRole(['admin']));

// ====================
// EMAILS
// ====================
router.post('/email/send', emailController.sendEmail);
router.post('/email/bulk', emailController.sendBulkEmail);
router.get('/email/verify', emailController.verifyEmailConnection);

// ====================
// SMS
// ====================
router.post('/sms/send', smsController.sendSMS);
router.post('/sms/bulk', smsController.sendBulkSMS);
router.get('/sms/balance', smsController.checkBalance);

module.exports = router;