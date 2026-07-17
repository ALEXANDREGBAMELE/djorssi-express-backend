const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { authenticate, isAdmin } = require('../middleware/auth');

// Toutes les routes utilisateur sont protégées
router.use(authenticate);

// ====================
// ROUTES UTILISATEUR (protégées)
// ====================
router.get('/me', userController.getProfile);
router.put('/me', userController.updateProfile);
router.delete('/me', userController.deleteAccount);
router.post('/change-password', userController.changePassword);

// ====================
// ROUTES ADMIN (protégées + admin)
// ====================
router.get('/getAll', isAdmin, userController.getAllUsers);
router.get('/getById/:id', isAdmin, userController.getUserById);
router.post('/create', isAdmin, userController.createUser);
router.put('/update/:id', isAdmin, userController.updateUser);
router.delete('/delete/:id', isAdmin, userController.deleteUser);

module.exports = router;