// src/routes/category.route.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../../config/permissions');

router.get('/', categoryController.getAllCategories);
router.get('/:id', categoryController.getCategoryById);
router.get('/:id/missions', categoryController.getMissionsByCategory);

router.use(authenticate);
router.use(requireRole(['admin']));

router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;