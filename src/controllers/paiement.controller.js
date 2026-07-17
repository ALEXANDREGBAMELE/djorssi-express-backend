// src/controllers/paiement.controller.js
const { Paiement, Candidature, Mission, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { createPaiementSchema, updatePaiementSchema, paiementQuerySchema } = require('../validators/paiement.validator');
const NotificationService = require('../services/notification.service');

const createPaiement = async (req, res, next) => {
  try {
    const result = createPaiementSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { candidature_id, montant, mode_paiement, reference } = result.data;
    const candidature = await Candidature.findByPk(candidature_id, { include: [{ model: Mission, as: 'mission' }, { model: User, as: 'dj' }] });
    if (!candidature) return res.status(404).json({ success: false, message: 'Candidature non trouvée' });
    if (candidature.mission.employer_id !== req.user.id) return res.status(403).json({ success: false, message: 'Non autorisé' });
    if (candidature.status !== 'acceptee') return res.status(400).json({ success: false, message: 'La candidature doit être acceptée' });
    const paiement = await Paiement.create({
      candidature_id, employeur_id: req.user.id, dj_id: candidature.dj_id,
      montant, mode_paiement, reference, status: 'confirme', date_paiement: new Date()
    });
    await NotificationService.create(candidature.dj_id, 'paiement_recu', 'Paiement reçu', `Vous avez reçu ${montant} FCFA`, `/missions/${candidature.mission_id}`, { paiement_id: paiement.id });
    const paiementWithDetails = await Paiement.findByPk(paiement.id, { include: [{ model: User, as: 'dj', attributes: ['id', 'username', 'first_name', 'last_name'] }, { model: Candidature, as: 'candidature', include: [{ model: Mission, as: 'mission', attributes: ['id', 'title'] }] }] });
    res.status(201).json({ success: true, data: { paiement: paiementWithDetails } });
  } catch (error) {
    logger.error('Erreur createPaiement:', error);
    next(error);
  }
};

const getPaiementsByMission = async (req, res, next) => {
  try {
    const { missionId } = req.params;
    const result = paiementQuerySchema.safeParse(req.query);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { page = 1, limit = 20, status } = result.data;
    const mission = await Mission.findByPk(missionId);
    if (!mission) return res.status(404).json({ success: false, message: 'Mission non trouvée' });
    if (mission.employer_id !== req.user.id) return res.status(403).json({ success: false, message: 'Non autorisé' });
    const candidatures = await Candidature.findAll({ where: { mission_id: missionId, status: 'acceptee' }, attributes: ['id'] });
    const candidatureIds = candidatures.map(c => c.id);
    const where = { candidature_id: candidatureIds };
    if (status) where.status = status;
    const offset = (page - 1) * limit;
    const { count, rows } = await Paiement.findAndCountAll({
      where, include: [{ model: User, as: 'dj', attributes: ['id', 'username', 'first_name', 'last_name'] }, { model: Candidature, as: 'candidature', attributes: ['id'] }],
      order: [['createdAt', 'DESC']], limit, offset
    });
    res.json({ success: true, data: { paiements: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } } });
  } catch (error) {
    logger.error('Erreur getPaiementsByMission:', error);
    next(error);
  }
};

const getPaiementsByDJ = async (req, res, next) => {
  try {
    const result = paiementQuerySchema.safeParse(req.query);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { page = 1, limit = 20, status } = result.data;
    const where = { dj_id: req.user.id };
    if (status) where.status = status;
    const offset = (page - 1) * limit;
    const { count, rows } = await Paiement.findAndCountAll({
      where, include: [{ model: Candidature, as: 'candidature', include: [{ model: Mission, as: 'mission', attributes: ['id', 'title'] }] }],
      order: [['createdAt', 'DESC']], limit, offset
    });
    res.json({ success: true, data: { paiements: rows, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } } });
  } catch (error) {
    logger.error('Erreur getPaiementsByDJ:', error);
    next(error);
  }
};

module.exports = { createPaiement, getPaiementsByMission, getPaiementsByDJ };