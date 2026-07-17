const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

// Routes publiques (pas besoin de token)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh-token', authController.refreshToken);

// Routes protégées (nécessitent un token)
router.post('/logout', authenticate, authController.logout);
router.get('/profile', authenticate, authController.profile);

module.exports = router;