// src/controllers/avis.controller.js
const { Avis, User, Mission, Candidature } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { createAvisSchema, repondreAvisSchema, avisQuerySchema } = require('../validators/avis.validator');
const NotificationService = require('../services/notification.service');

const createAvis = async (req, res, next) => {
  try {
    const result = createAvisSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { note, commentaire, cible_id, evaluation_details } = result.data;
    const mission = await Mission.findByPk(req.params.missionId);
    if (!mission) return res.status(404).json({ success: false, message: 'Mission non trouvée' });
    if (mission.status !== 'terminee') return res.status(400).json({ success: false, message: 'La mission doit être terminée' });
    const isParticipant = await Candidature.findOne({ where: { mission_id: mission.id, [Op.or]: [{ dj_id: req.user.id }, { dj_id: cible_id }], status: 'acceptee' } });
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé' });
    const existing = await Avis.findOne({ where: { mission_id: mission.id, auteur_id: req.user.id, cible_id } });
    if (existing) return res.status(400).json({ success: false, message: 'Avis déjà donné' });
    const avis = await Avis.create({ mission_id: mission.id, auteur_id: req.user.id, cible_id, note, commentaire, evaluation_details: evaluation_details || {}, is_verified: true });
    await NotificationService.create(cible_id, 'nouvel_avis', 'Nouvel avis', `${req.user.first_name} a laissé un avis`, `/missions/${mission.id}`, { avis_id: avis.id });
    const avisWithDetails = await Avis.findByPk(avis.id, { include: [{ model: User, as: 'auteur', attributes: ['id', 'username', 'first_name', 'last_name'] }, { model: Mission, as: 'mission', attributes: ['id', 'title'] }] });
    res.status(201).json({ success: true, data: { avis: avisWithDetails } });
  } catch (error) {
    logger.error('Erreur createAvis:', error);
    next(error);
  }
};

const getAvisByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const result = avisQuerySchema.safeParse(req.query);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { page = 1, limit = 20 } = result.data;
    const offset = (page - 1) * limit;
    const { count, rows } = await Avis.findAndCountAll({
      where: { cible_id: userId, is_public: true },
      include: [{ model: User, as: 'auteur', attributes: ['id', 'username', 'first_name', 'last_name'] }, { model: Mission, as: 'mission', attributes: ['id', 'title'] }],
      order: [['createdAt', 'DESC']], limit, offset
    });
    const avgNote = await Avis.findOne({ where: { cible_id: userId, is_public: true }, attributes: [[sequelize.fn('AVG', sequelize.col('note')), 'average']] });
    res.json({ success: true, data: { avis: rows, stats: { total: count, average: parseFloat(avgNote?.dataValues?.average || 0).toFixed(2) }, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } } });
  } catch (error) {
    logger.error('Erreur getAvisByUser:', error);
    next(error);
  }
};

const getAvisByMission = async (req, res, next) => {
  try {
    const result = avisQuerySchema.safeParse(req.query);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { page = 1, limit = 20 } = result.data;
    const offset = (page - 1) * limit;
    const { count, rows } = await Avis.findAndCountAll({
      where: { mission_id: req.params.missionId, is_public: true },
      include: [{ model: User, as: 'auteur', attributes: ['id', 'username', 'first_name', 'last_name'] }, { model: User, as: 'cible', attributes: ['id', 'username', 'first_name', 'last_name'] }],
      order: [['createdAt', 'DESC']], limit, offset
    });
    res.json({ success: true, data: { avis: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } } });
  } catch (error) {
    logger.error('Erreur getAvisByMission:', error);
    next(error);
  }
};

const repondreAvis = async (req, res, next) => {
  try {
    const result = repondreAvisSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const avis = await Avis.findByPk(req.params.id);
    if (!avis) return res.status(404).json({ success: false, message: 'Avis non trouvé' });
    if (avis.cible_id !== req.user.id) return res.status(403).json({ success: false, message: 'Non autorisé' });
    await avis.update({ reponse: result.data.reponse, reponse_date: new Date() });
    res.json({ success: true, data: { avis } });
  } catch (error) {
    logger.error('Erreur repondreAvis:', error);
    next(error);
  }
};

module.exports = { createAvis, getAvisByUser, getAvisByMission, repondreAvis };