// src/controllers/category.controller.js
const { CategoryMission, Mission } = require('../models');
const logger = require('../../config/logger');
const { createCategorySchema, updateCategorySchema } = require('../validators/category.validator');

const createCategory = async (req, res, next) => {
  try {
    const result = createCategorySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    }
    const category = await CategoryMission.create(result.data);
    res.status(201).json({ success: true, data: { category } });
  } catch (error) {
    logger.error('Erreur createCategory:', error);
    next(error);
  }
};

const getAllCategories = async (req, res, next) => {
  try {
    const categories = await CategoryMission.findAll({
      where: { is_active: true },
      order: [['order', 'ASC'], ['name', 'ASC']],
      include: [{ model: CategoryMission, as: 'children', required: false }]
    });
    res.json({ success: true, data: { categories: categories.filter(c => !c.parent_id) } });
  } catch (error) {
    logger.error('Erreur getAllCategories:', error);
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  try {
    const category = await CategoryMission.findByPk(req.params.id, {
      include: [
        { model: CategoryMission, as: 'parent' },
        { model: CategoryMission, as: 'children', required: false },
        { model: Mission, as: 'missions', attributes: ['id', 'title', 'status'], limit: 5 }
      ]
    });
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    res.json({ success: true, data: { category } });
  } catch (error) {
    logger.error('Erreur getCategoryById:', error);
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const result = updateCategorySchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const category = await CategoryMission.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    await category.update(result.data);
    res.json({ success: true, data: { category } });
  } catch (error) {
    logger.error('Erreur updateCategory:', error);
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const category = await CategoryMission.findByPk(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    const childrenCount = await CategoryMission.count({ where: { parent_id: category.id } });
    if (childrenCount > 0) {
      return res.status(400).json({ success: false, message: 'Impossible de supprimer une catégorie avec des sous-catégories' });
    }
    await category.destroy();
    res.json({ success: true, message: 'Catégorie supprimée' });
  } catch (error) {
    logger.error('Erreur deleteCategory:', error);
    next(error);
  }
};

const getMissionsByCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const category = await CategoryMission.findByPk(id);
    if (!category) return res.status(404).json({ success: false, message: 'Catégorie non trouvée' });
    const offset = (page - 1) * limit;
    const { count, rows } = await Mission.findAndCountAll({
      where: { category_id: id, status: 'publiee' },
      include: [{ model: User, as: 'employer', attributes: ['id', 'username', 'first_name', 'last_name'] }],
      order: [['createdAt', 'DESC']],
      limit, offset
    });
    res.json({ success: true, data: { category, missions: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } } });
  } catch (error) {
    logger.error('Erreur getMissionsByCategory:', error);
    next(error);
  }
};

module.exports = { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory, getMissionsByCategory };