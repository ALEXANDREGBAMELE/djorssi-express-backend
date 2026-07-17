// src/controllers/notification.controller.js
const { Notification } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { notificationQuerySchema } = require('../validators/notification.validator');

const getNotifications = async (req, res, next) => {
  try {
    const result = notificationQuerySchema.safeParse(req.query);
    if (!result.success) return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
    const { page = 1, limit = 20, is_read, type } = result.data;
    const where = { user_id: req.user.id };
    if (is_read !== undefined) where.is_read = is_read;
    if (type) where.type = type;
    const offset = (page - 1) * limit;
    const { count, rows } = await Notification.findAndCountAll({
      where, order: [['createdAt', 'DESC']], limit, offset
    });
    const unreadCount = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.json({ success: true, data: { notifications: rows, unreadCount, pagination: { total: count, page, limit, totalPages: Math.ceil(count / limit) } } });
  } catch (error) {
    logger.error('Erreur getNotifications:', error);
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!notification) return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    await notification.update({ is_read: true, read_at: new Date() });
    res.json({ success: true, data: { notification } });
  } catch (error) {
    logger.error('Erreur markAsRead:', error);
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.update({ is_read: true, read_at: new Date() }, { where: { user_id: req.user.id, is_read: false } });
    res.json({ success: true, message: 'Toutes les notifications sont lues' });
  } catch (error) {
    logger.error('Erreur markAllAsRead:', error);
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const deleted = await Notification.destroy({ where: { id: req.params.id, user_id: req.user.id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    res.json({ success: true, message: 'Notification supprimée' });
  } catch (error) {
    logger.error('Erreur deleteNotification:', error);
    next(error);
  }
};

const deleteAll = async (req, res, next) => {
  try {
    await Notification.destroy({ where: { user_id: req.user.id } });
    res.json({ success: true, message: 'Toutes les notifications supprimées' });
  } catch (error) {
    logger.error('Erreur deleteAll:', error);
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({ where: { user_id: req.user.id, is_read: false } });
    res.json({ success: true, data: { unreadCount: count } });
  } catch (error) {
    logger.error('Erreur getUnreadCount:', error);
    next(error);
  }
};

module.exports = { getNotifications, markAsRead, markAllAsRead, deleteNotification, deleteAll, getUnreadCount };