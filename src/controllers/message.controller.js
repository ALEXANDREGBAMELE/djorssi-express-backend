// src/controllers/message.controller.js
const MessageService = require('../services/message.service');
const { createConversationSchema, sendMessageSchema, markAsReadSchema, messageQuerySchema } = require('../validators/message.validator');
const logger = require('../../config/logger');

// ====================
// CONVERSATIONS
// ====================

// Lister les conversations
const getConversations = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const result = await MessageService.getConversations(
      req.user.id,
      parseInt(page),
      parseInt(limit)
    );
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Erreur getConversations:', error);
    next(error);
  }
};

// Créer une conversation
const createConversation = async (req, res, next) => {
  try {
    const result = createConversationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { participant_id, mission_id, initial_message } = result.data;
    const conversation = await MessageService.createConversation(
      req.user.id,
      participant_id,
      mission_id,
      initial_message
    );

    res.status(201).json({
      success: true,
      data: { conversation }
    });
  } catch (error) {
    logger.error('Erreur createConversation:', error);
    next(error);
  }
};

// ====================
// MESSAGES
// ====================

// Récupérer les messages d'une conversation
const getMessages = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = messageQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { page = 1, limit = 50, before } = result.data;
    const messages = await MessageService.getMessages(
      id,
      req.user.id,
      parseInt(page),
      parseInt(limit),
      before
    );

    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    logger.error('Erreur getMessages:', error);
    next(error);
  }
};

// Envoyer un message
const sendMessage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = sendMessageSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { content, type, metadata } = result.data;
    const message = await MessageService.sendMessage(
      id,
      req.user.id,
      content,
      type,
      metadata
    );

    res.status(201).json({
      success: true,
      data: { message }
    });
  } catch (error) {
    logger.error('Erreur sendMessage:', error);
    next(error);
  }
};

// Marquer des messages comme lus
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = markAsReadSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    await MessageService.markAsRead(
      id,
      req.user.id,
      result.data.message_ids
    );

    res.json({
      success: true,
      message: 'Messages marqués comme lus'
    });
  } catch (error) {
    logger.error('Erreur markAsRead:', error);
    next(error);
  }
};

// Compter les messages non lus
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await MessageService.getUnreadCount(req.user.id);
    res.json({
      success: true,
      data: { unread_count: count }
    });
  } catch (error) {
    logger.error('Erreur getUnreadCount:', error);
    next(error);
  }
};

module.exports = {
  getConversations,
  createConversation,
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount
};