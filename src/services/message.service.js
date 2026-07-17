// src/services/message.service.js
const { Conversation, Message, User, Mission } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const NotificationService = require('./notification.service');
const CacheService = require('./cache.service');

class MessageService {
  // Créer une conversation
  static async createConversation(userId, participantId, missionId = null, initialMessage = null) {
    try {
      // Vérifier que les participants existent
      const participant = await User.findByPk(participantId);
      if (!participant) {
        throw new Error('Participant non trouvé');
      }

      // Vérifier si une conversation existe déjà
      let conversation = await Conversation.findOne({
        where: {
          is_active: true,
          [Op.or]: [
            { participant1_id: userId, participant2_id: participantId },
            { participant1_id: participantId, participant2_id: userId }
          ]
        }
      });

      if (conversation) {
        // Si mission_id est fourni, mettre à jour
        if (missionId && !conversation.mission_id) {
          await conversation.update({ mission_id: missionId });
        }
        return conversation;
      }

      // Créer la conversation
      conversation = await Conversation.create({
        participant1_id: userId,
        participant2_id: participantId,
        mission_id: missionId || null,
        last_message: initialMessage || null,
        last_message_at: initialMessage ? new Date() : null,
        last_message_sender_id: initialMessage ? userId : null,
        unread_count_p1: 0,
        unread_count_p2: initialMessage ? 1 : 0,
        is_active: true,
      });

      // Si message initial, le créer
      if (initialMessage) {
        const message = await Message.create({
          conversation_id: conversation.id,
          sender_id: userId,
          content: initialMessage,
          type: 'text',
          is_read: false,
        });

        // Notification au participant
        await NotificationService.create(
          participantId,
          'nouveau_message',
          'Nouveau message',
          `${userId} vous a envoyé un message`,
          `/messages/${conversation.id}`,
          { conversation_id: conversation.id }
        );
      }

      return conversation;
    } catch (error) {
      logger.error('Erreur createConversation:', error);
      throw error;
    }
  }

  // Récupérer les conversations d'un utilisateur
  static async getConversations(userId, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await Conversation.findAndCountAll({
        where: {
          is_active: true,
          [Op.or]: [
            { participant1_id: userId },
            { participant2_id: userId }
          ]
        },
        include: [
          {
            model: User,
            as: 'participant1',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
          },
          {
            model: User,
            as: 'participant2',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
          },
          {
            model: Mission,
            as: 'mission',
            attributes: ['id', 'title', 'status']
          },
          {
            model: Message,
            as: 'messages',
            attributes: ['id', 'content', 'createdAt', 'is_read'],
            limit: 1,
            order: [['createdAt', 'DESC']]
          }
        ],
        order: [['last_message_at', 'DESC']],
        limit,
        offset
      });

      // Calculer les non-lus pour chaque conversation
      const conversations = rows.map(conv => {
        const isParticipant1 = conv.participant1_id === userId;
        const unreadCount = isParticipant1 ? conv.unread_count_p1 : conv.unread_count_p2;
        const otherParticipant = isParticipant1 ? conv.participant2 : conv.participant1;
        
        return {
          ...conv.toJSON(),
          unread_count: unreadCount,
          other_participant: otherParticipant
        };
      });

      return {
        conversations,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error('Erreur getConversations:', error);
      throw error;
    }
  }

  // Récupérer les messages d'une conversation
  static async getMessages(conversationId, userId, page = 1, limit = 50, before = null) {
    try {
      // Vérifier que l'utilisateur est participant
      const conversation = await Conversation.findOne({
        where: {
          id: conversationId,
          is_active: true,
          [Op.or]: [
            { participant1_id: userId },
            { participant2_id: userId }
          ]
        }
      });

      if (!conversation) {
        throw new Error('Conversation non trouvée ou accès non autorisé');
      }

      const offset = (page - 1) * limit;
      const where = { conversation_id: conversationId };
      
      if (before) {
        where.createdAt = { [Op.lt]: new Date(before) };
      }

      const { count, rows } = await Message.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      // Marquer les messages comme lus
      const isParticipant1 = conversation.participant1_id === userId;
      const unreadField = isParticipant1 ? 'unread_count_p1' : 'unread_count_p2';
      
      // Réinitialiser le compteur de non-lus
      await conversation.update({ [unreadField]: 0 });

      // Marquer les messages comme lus
      await Message.update(
        { is_read: true, read_at: new Date() },
        {
          where: {
            conversation_id: conversationId,
            sender_id: { [Op.ne]: userId },
            is_read: false
          }
        }
      );

      return {
        messages: rows.reverse(),
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error('Erreur getMessages:', error);
      throw error;
    }
  }

  // Envoyer un message
  static async sendMessage(conversationId, userId, content, type = 'text', metadata = null) {
    try {
      // Vérifier la conversation
      const conversation = await Conversation.findOne({
        where: {
          id: conversationId,
          is_active: true,
          [Op.or]: [
            { participant1_id: userId },
            { participant2_id: userId }
          ]
        }
      });

      if (!conversation) {
        throw new Error('Conversation non trouvée ou accès non autorisé');
      }

      // Créer le message
      const message = await Message.create({
        conversation_id: conversationId,
        sender_id: userId,
        content,
        type,
        metadata: metadata || {},
        is_read: false,
      });

      // Mettre à jour la conversation
      const isParticipant1 = conversation.participant1_id === userId;
      const unreadField = isParticipant1 ? 'unread_count_p2' : 'unread_count_p1';
      const otherParticipantId = isParticipant1 ? conversation.participant2_id : conversation.participant1_id;

      await conversation.update({
        last_message: content,
        last_message_at: new Date(),
        last_message_sender_id: userId,
        [unreadField]: conversation[unreadField] + 1
      });

      // Invalider le cache
      await CacheService.delPattern(`cache:conversations:${otherParticipantId}`);
      await CacheService.delPattern(`cache:messages:${conversationId}`);

      // Notification au destinataire
      await NotificationService.create(
        otherParticipantId,
        'nouveau_message',
        'Nouveau message',
        `Nouveau message de ${userId}`,
        `/messages/${conversationId}`,
        { conversation_id: conversationId, message_id: message.id }
      );

      // Retourner le message avec le sender
      const messageWithSender = await Message.findByPk(message.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
          }
        ]
      });

      return messageWithSender;
    } catch (error) {
      logger.error('Erreur sendMessage:', error);
      throw error;
    }
  }

  // Marquer des messages comme lus
  static async markAsRead(conversationId, userId, messageIds = null) {
    try {
      // Vérifier la conversation
      const conversation = await Conversation.findOne({
        where: {
          id: conversationId,
          is_active: true,
          [Op.or]: [
            { participant1_id: userId },
            { participant2_id: userId }
          ]
        }
      });

      if (!conversation) {
        throw new Error('Conversation non trouvée ou accès non autorisé');
      }

      const where = {
        conversation_id: conversationId,
        sender_id: { [Op.ne]: userId },
        is_read: false
      };

      if (messageIds && messageIds.length > 0) {
        where.id = { [Op.in]: messageIds };
      }

      await Message.update(
        { is_read: true, read_at: new Date() },
        { where }
      );

      // Réinitialiser le compteur de non-lus
      const isParticipant1 = conversation.participant1_id === userId;
      const unreadField = isParticipant1 ? 'unread_count_p1' : 'unread_count_p2';
      await conversation.update({ [unreadField]: 0 });

      // Invalider le cache
      await CacheService.delPattern(`cache:messages:${conversationId}`);

      return true;
    } catch (error) {
      logger.error('Erreur markAsRead:', error);
      throw error;
    }
  }

  // Compter les messages non lus
  static async getUnreadCount(userId) {
    try {
      const conversations = await Conversation.findAll({
        where: {
          is_active: true,
          [Op.or]: [
            { participant1_id: userId },
            { participant2_id: userId }
          ]
        }
      });

      let totalUnread = 0;
      for (const conv of conversations) {
        const isParticipant1 = conv.participant1_id === userId;
        totalUnread += isParticipant1 ? conv.unread_count_p1 : conv.unread_count_p2;
      }

      return totalUnread;
    } catch (error) {
      logger.error('Erreur getUnreadCount:', error);
      return 0;
    }
  }
}

module.exports = MessageService;