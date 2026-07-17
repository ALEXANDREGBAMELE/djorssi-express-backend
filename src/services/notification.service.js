// src/services/notification.service.js
const { Notification, User, Mission } = require('../models');
const { notificationQueue } = require('../queues');
const logger = require('../../config/logger');
const CacheService = require('./cache.service');
const emailService = require('../../config/email');
const smsService = require('../../config/sms');
const smsTemplates = require('../../config/sms-templates');

class NotificationService {
  // ====================
  // MÉTHODES DE BASE
  // ====================

  // Créer une notification (avec queue)
  static async create(userId, type, title, message, link = null, data = null, priority = 'normal') {
    try {
      // Ajouter à la queue pour traitement asynchrone
      const job = await notificationQueue.add('send-notification', {
        userId,
        type,
        title,
        message,
        link,
        data,
        priority
      }, {
        priority: priority === 'high' ? 1 : priority === 'low' ? 10 : 5
      });

      logger.info(`Notification en file d'attente: ${type} pour user ${userId}`);
      return job;
    } catch (error) {
      logger.error('Erreur notification queue:', error);
      // Fallback: création synchrone
      return await this.createSync(userId, type, title, message, link, data);
    }
  }

  // Création synchrone (fallback)
  static async createSync(userId, type, title, message, link = null, data = null) {
    try {
      const notification = await Notification.create({
        user_id: userId,
        type,
        title,
        message,
        link,
        data,
        is_read: false,
        is_sent: true
      });

      // Invalider le cache des notifications
      await CacheService.delPattern(`cache:*/api/notifications*:${userId}`);

      // Envoyer email et SMS en synchrone
      await this.sendEmailAndSMS(userId, type, title, message, data);

      logger.info(`Notification créée: ${type} pour user ${userId}`);
      return notification;
    } catch (error) {
      logger.error('Erreur création notification:', error);
      return null;
    }
  }

  // Créer des notifications en masse
  static async createBulk(userIds, type, title, message, link = null, data = null) {
    try {
      // Ajouter à la queue
      const job = await notificationQueue.add('send-bulk-notifications', {
        userIds,
        type,
        title,
        message,
        link,
        data
      });

      logger.info(`Bulk notifications en file d'attente: ${userIds.length} users`);
      return job;
    } catch (error) {
      logger.error('Bulk notification queue error:', error);
      // Fallback
      return await this.createBulkSync(userIds, type, title, message, link, data);
    }
  }

  // Bulk synchrone (fallback)
  static async createBulkSync(userIds, type, title, message, link = null, data = null) {
    try {
      const notifications = userIds.map(userId => ({
        user_id: userId,
        type,
        title,
        message,
        link,
        data,
        is_read: false,
        is_sent: true
      }));
      
      const results = await Notification.bulkCreate(notifications);
      
      // Invalider les caches des utilisateurs concernés
      for (const userId of userIds) {
        await CacheService.delPattern(`cache:*/api/notifications*:${userId}`);
        await this.sendEmailAndSMS(userId, type, title, message, data);
      }

      logger.info(`Bulk notifications créées: ${results.length} notifications`);
      return results;
    } catch (error) {
      logger.error('Erreur bulk notifications:', error);
      return [];
    }
  }

  // ====================
  // EMAIL & SMS
  // ====================

  // Envoyer email et SMS pour une notification
  static async sendEmailAndSMS(userId, type, title, message, data = {}) {
    try {
      const user = await User.findByPk(userId);
      if (!user) return;

      // Envoyer l'email
      if (user.email && process.env.EMAIL_ENABLED === 'true') {
        await emailService.sendEmail({
          to: user.email,
          subject: title,
          template: 'notification',
          data: {
            name: user.first_name || user.username,
            title,
            message,
            details: data,
            actionUrl: data.link ? `${process.env.APP_URL || 'http://localhost:5000'}${data.link}` : null,
            actionLabel: 'Voir plus',
          },
        });
        logger.debug(`Email envoyé à ${user.email} pour la notification ${type}`);
      }

      // Envoyer le SMS
      if (user.phone && process.env.SMS_ENABLED === 'true') {
        const smsTemplate = smsTemplates[type];
        if (smsTemplate) {
          await smsService.sendSMS({
            to: user.phone,
            template: smsTemplate,
            data: { ...data, name: user.first_name || user.username },
          });
          logger.debug(`SMS envoyé à ${user.phone} pour la notification ${type}`);
        }
      }
    } catch (error) {
      logger.error('Erreur envoi email/SMS:', error);
    }
  }

  // ====================
  // GESTION DES NOTIFICATIONS
  // ====================

  // Marquer comme lue
  static async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOne({
        where: { id: notificationId, user_id: userId }
      });
      
      if (notification) {
        notification.is_read = true;
        notification.read_at = new Date();
        await notification.save();
        
        // Invalider le cache des notifications non lues
        await CacheService.del(`cache:notifications:unread:${userId}`);
        
        logger.debug(`Notification ${notificationId} marquée comme lue`);
        return notification;
      }
      return null;
    } catch (error) {
      logger.error('Erreur markAsRead:', error);
      return null;
    }
  }

  // Marquer toutes comme lues
  static async markAllAsRead(userId) {
    try {
      await Notification.update(
        { is_read: true, read_at: new Date() },
        { where: { user_id: userId, is_read: false } }
      );
      
      // Invalider le cache des notifications non lues
      await CacheService.del(`cache:notifications:unread:${userId}`);
      await CacheService.delPattern(`cache:*/api/notifications*:${userId}`);
      
      logger.info(`Toutes les notifications marquées comme lues pour user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Erreur markAllAsRead:', error);
      return false;
    }
  }

  // Récupérer les notifications d'un utilisateur (avec cache)
  static async getUserNotifications(userId, page = 1, limit = 20, useCache = true) {
    try {
      const cacheKey = `cache:notifications:${userId}:page:${page}:limit:${limit}`;
      
      if (useCache) {
        const cached = await CacheService.get(cacheKey);
        if (cached) {
          logger.debug(`Notifications cache HIT pour user ${userId}`);
          return cached;
        }
      }

      const offset = (page - 1) * limit;
      const { count, rows } = await Notification.findAndCountAll({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const unreadCount = await Notification.count({
        where: { user_id: userId, is_read: false }
      });

      const result = {
        notifications: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          unreadCount
        }
      };

      // Mettre en cache pour 1 minute
      if (useCache) {
        await CacheService.set(cacheKey, result, 60);
      }

      return result;
    } catch (error) {
      logger.error('Erreur getUserNotifications:', error);
      // Fallback sans cache
      const offset = (page - 1) * limit;
      const { count, rows } = await Notification.findAndCountAll({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      const unreadCount = await Notification.count({
        where: { user_id: userId, is_read: false }
      });

      return {
        notifications: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
          unreadCount
        }
      };
    }
  }

  // Récupérer le nombre de notifications non lues (avec cache)
  static async getUnreadCount(userId, useCache = true) {
    try {
      const cacheKey = `cache:notifications:unread:${userId}`;
      
      if (useCache) {
        const cached = await CacheService.get(cacheKey);
        if (cached !== null) {
          return cached;
        }
      }

      const count = await Notification.count({
        where: { user_id: userId, is_read: false }
      });

      // Mettre en cache pour 30 secondes
      if (useCache) {
        await CacheService.set(cacheKey, count, 30);
      }

      return count;
    } catch (error) {
      logger.error('Erreur getUnreadCount:', error);
      return await Notification.count({
        where: { user_id: userId, is_read: false }
      });
    }
  }

  // Supprimer une notification
  static async delete(notificationId, userId) {
    try {
      const result = await Notification.destroy({
        where: { id: notificationId, user_id: userId }
      });
      
      if (result) {
        // Invalider les caches
        await CacheService.delPattern(`cache:notifications:${userId}`);
        await CacheService.del(`cache:notifications:unread:${userId}`);
        logger.debug(`Notification ${notificationId} supprimée`);
      }
      
      return result;
    } catch (error) {
      logger.error('Erreur delete:', error);
      return 0;
    }
  }

  // Supprimer toutes les notifications d'un utilisateur
  static async deleteAll(userId) {
    try {
      const result = await Notification.destroy({ where: { user_id: userId } });
      
      // Invalider les caches
      await CacheService.delPattern(`cache:notifications:${userId}`);
      await CacheService.del(`cache:notifications:unread:${userId}`);
      
      logger.info(`Toutes les notifications supprimées pour user ${userId}`);
      return result;
    } catch (error) {
      logger.error('Erreur deleteAll:', error);
      return 0;
    }
  }

  // Marquer comme envoyée (après envoi réel)
  static async markAsSent(notificationId) {
    try {
      await Notification.update(
        { is_sent: true },
        { where: { id: notificationId } }
      );
      return true;
    } catch (error) {
      logger.error('Erreur markAsSent:', error);
      return false;
    }
  }

  // ====================
  // NOTIFICATIONS SPÉCIFIQUES (avec Email + SMS)
  // ====================

  // Nouvelle candidature
  static async nouvelleCandidature(candidature, dj) {
    const mission = await Mission.findByPk(candidature.mission_id);
    const employer = await User.findByPk(mission.employer_id);
    
    const message = `${dj.first_name} ${dj.last_name} a postulé à votre mission "${mission.title}"`;
    const data = {
      candidature_id: candidature.id,
      dj_id: dj.id,
      mission_id: mission.id,
      missionTitle: mission.title,
      candidateName: `${dj.first_name} ${dj.last_name}`,
      link: `/missions/${mission.id}/candidatures`,
    };

    // Notification en base (avec email + SMS via queue)
    return await this.create(
      employer.id,
      'nouvelle_candidature',
      'Nouvelle candidature reçue',
      message,
      `/missions/${mission.id}/candidatures`,
      data
    );
  }

  // Candidature acceptée
  static async candidatureAcceptee(candidature) {
    const mission = await Mission.findByPk(candidature.mission_id);
    const dj = await User.findByPk(candidature.dj_id);
    
    const message = `Félicitations ! Vous avez été accepté pour la mission "${mission.title}"`;
    const data = {
      candidature_id: candidature.id,
      mission_id: mission.id,
      missionTitle: mission.title,
      link: `/missions/${mission.id}`,
    };

    return await this.create(
      dj.id,
      'candidature_acceptee',
      'Candidature acceptée ! 🎉',
      message,
      `/missions/${mission.id}`,
      data,
      'high'
    );
  }

  // Candidature refusée
  static async candidatureRefusee(candidature) {
    const mission = await Mission.findByPk(candidature.mission_id);
    const dj = await User.findByPk(candidature.dj_id);
    
    const message = `Votre candidature pour la mission "${mission.title}" a été refusée`;
    const data = {
      candidature_id: candidature.id,
      mission_id: mission.id,
      missionTitle: mission.title,
    };

    return await this.create(
      dj.id,
      'candidature_refusee',
      'Candidature refusée',
      message,
      `/missions/${mission.id}`,
      data
    );
  }

  // Nouvelle mission publiée
  static async nouvelleMission(mission, djs) {
    const userIds = djs.map(dj => dj.id);
    const message = `Une nouvelle mission "${mission.title}" vient d'être publiée dans votre région`;
    const data = {
      mission_id: mission.id,
      missionTitle: mission.title,
      city: mission.ville,
      link: `/missions/${mission.id}`,
    };

    return await this.createBulk(
      userIds,
      'nouvelle_mission',
      'Nouvelle mission disponible 🎵',
      message,
      `/missions/${mission.id}`,
      data
    );
  }

  // DJ sélectionné
  static async djSelectionne(mission, dj) {
    const message = `Vous avez été sélectionné pour la mission "${mission.title}"`;
    const data = {
      mission_id: mission.id,
      missionTitle: mission.title,
      dj_id: dj.id,
      link: `/missions/${mission.id}`,
    };

    return await this.create(
      dj.id,
      'selection_dj',
      'Sélectionné pour une mission 🎯',
      message,
      `/missions/${mission.id}`,
      data,
      'high'
    );
  }

  // Paiement reçu
  static async paiementRecu(dj, mission, montant) {
    const message = `Vous avez reçu ${montant} FCFA pour la mission "${mission.title}"`;
    const data = {
      mission_id: mission.id,
      missionTitle: mission.title,
      amount: montant,
      link: `/missions/${mission.id}`,
    };

    return await this.create(
      dj.id,
      'paiement_recu',
      'Paiement reçu 💰',
      message,
      `/missions/${mission.id}`,
      data,
      'high'
    );
  }

  // Nouvel avis
  static async nouvelAvis(cible, auteur, mission, note) {
    const message = `${auteur.first_name} ${auteur.last_name} a laissé un avis (${note}/5) sur la mission "${mission.title}"`;
    const data = {
      mission_id: mission.id,
      missionTitle: mission.title,
      note,
      auteur_id: auteur.id,
      auteurName: `${auteur.first_name} ${auteur.last_name}`,
      link: `/missions/${mission.id}`,
    };

    return await this.create(
      cible.id,
      'nouvel_avis',
      'Nouvel avis reçu ⭐',
      message,
      `/missions/${mission.id}`,
      data
    );
  }

  // Nouveau message
  static async nouveauMessage(conversation, sender, receiver, messageContent) {
    const message = `${sender.first_name} ${sender.last_name} vous a envoyé un message`;
    const data = {
      conversation_id: conversation.id,
      sender_id: sender.id,
      senderName: `${sender.first_name} ${sender.last_name}`,
      message: messageContent,
      link: `/messages/${conversation.id}`,
    };

    return await this.create(
      receiver.id,
      'nouveau_message',
      'Nouveau message 💬',
      message,
      `/messages/${conversation.id}`,
      data,
      'high'
    );
  }

  // Rappel de mission (J-1)
  static async rappelMission(dj, mission) {
    const date = new Date(mission.date_mission);
    const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    const message = `Rappel : Votre mission "${mission.title}" aura lieu demain à ${timeStr}`;
    const data = {
      mission_id: mission.id,
      missionTitle: mission.title,
      date: mission.date_mission,
      time: timeStr,
      link: `/missions/${mission.id}`,
    };

    return await this.create(
      dj.id,
      'rappel_date',
      'Rappel de mission 🔔',
      message,
      `/missions/${mission.id}`,
      data,
      'high'
    );
  }

  // Vérification d'identité approuvée
  static async identityVerified(user) {
    const message = 'Votre identité a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités.';
    const data = {
      user_id: user.id,
      link: '/profile/verification',
    };

    return await this.create(
      user.id,
      'identity_verified',
      'Vérification d\'identité approuvée ✅',
      message,
      '/profile/verification',
      data,
      'high'
    );
  }

  // Vérification d'identité rejetée
  static async identityRejected(user, reason) {
    const message = `Votre demande de vérification a été rejetée. Raison: ${reason}`;
    const data = {
      user_id: user.id,
      reason,
      link: '/profile/verification',
    };

    return await this.create(
      user.id,
      'identity_rejected',
      'Vérification d\'identité rejetée ❌',
      message,
      '/profile/verification',
      data
    );
  }

  // Message système
  static async systemMessage(userId, title, message, link = null) {
    const data = { type: 'system' };
    return await this.create(
      userId,
      'systeme',
      title,
      message,
      link,
      data
    );
  }

  // ====================
  // NOTIFICATIONS DE BIENVENUE
  // ====================

  // Email de bienvenue
  static async sendWelcomeEmail(user) {
    try {
      if (!user.email) return;

      await emailService.sendEmail({
        to: user.email,
        subject: '🎵 Bienvenue sur Djorssi Express !',
        template: 'welcome',
        data: {
          name: user.first_name || user.username,
          username: user.username,
          email: user.email,
          userType: user.user_type,
          userTypeEmployeur: user.user_type === 'employeur',
          userTypeDj: user.user_type === 'djorssi',
          loginUrl: `${process.env.APP_URL || 'http://localhost:5000'}/login`,
        },
      });

      logger.info(`Email de bienvenue envoyé à ${user.email}`);
      return true;
    } catch (error) {
      logger.error('Erreur envoi email de bienvenue:', error);
      return false;
    }
  }

  // SMS de bienvenue
  static async sendWelcomeSMS(user) {
    try {
      if (!user.phone) return;

      await smsService.sendSMS({
        to: user.phone,
        template: smsTemplates.welcome,
        data: {
          name: user.first_name || user.username,
        },
      });

      logger.info(`SMS de bienvenue envoyé à ${user.phone}`);
      return true;
    } catch (error) {
      logger.error('Erreur envoi SMS de bienvenue:', error);
      return false;
    }
  }
}

module.exports = NotificationService;