// src/services/dashboard.service.js
const { User, Mission, Candidature, Avis, Paiement, Conversation, Message } = require('../models');
const { Op } = require('sequelize');
const CacheService = require('./cache.service');
const logger = require('../../config/logger');

class DashboardService {
  // ====================
  // DASHBOARD DJ
  // ====================
  static async getDjDashboard(userId) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Vérifier le cache
    const cacheKey = `dashboard:dj:${userId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Missions en cours (temps réel)
    const missionsEnCours = await Mission.findAll({
      where: { status: 'en_cours' },
      include: [{
        model: User,
        as: 'dj_selectionnes',
        where: { id: userId },
        through: { attributes: ['status', 'remuneration_specifique'] }
      }],
      attributes: ['id', 'title', 'date_mission', 'lieu', 'ville', 'budget']
    });

    // 2. Missions à venir (prochaines 7 jours)
    const missionsAVenir = await Mission.findAll({
      where: {
        status: 'publiee',
        date_mission: {
          [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        }
      },
      include: [{
        model: User,
        as: 'dj_selectionnes',
        where: { id: userId },
        through: { attributes: ['status'] },
        required: false
      }],
      attributes: ['id', 'title', 'date_mission', 'lieu', 'ville', 'budget']
    });

    // 3. KPI du jour
    const kpi = await this.calculateDjKPI(userId, startOfDay, now);

    // 4. Activité récente (candidatures, messages)
    const recentActivity = await this.getRecentActivity(userId);

    // 5. Messages non lus
    const unreadMessages = await Message.count({
      where: {
        conversation_id: {
          [Op.in]: await this.getUserConversations(userId)
        },
        sender_id: { [Op.ne]: userId },
        is_read: false
      }
    });

    // 6. Notifications non lues
    const unreadNotifications = await Notification.count({
      where: { user_id: userId, is_read: false }
    });

    const result = {
      user: {
        id: userId,
        // Les infos utilisateur seront ajoutées par le contrôleur
      },
      missions_en_cours: missionsEnCours,
      missions_a_venir: missionsAVenir,
      kpi,
      recent_activity: recentActivity,
      unread_messages: unreadMessages,
      unread_notifications: unreadNotifications,
      last_update: new Date()
    };

    // Mettre en cache pour 30 secondes
    await CacheService.set(cacheKey, result, 30);

    return result;
  }

  // ====================
  // DASHBOARD EMPLOYEUR
  // ====================
  static async getEmployeurDashboard(userId) {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const cacheKey = `dashboard:employeur:${userId}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Missions actives
    const missionsActives = await Mission.findAll({
      where: {
        employer_id: userId,
        status: { [Op.in]: ['publiee', 'en_cours'] }
      },
      include: [{
        model: Candidature,
        as: 'candidatures',
        where: { status: 'en_attente' },
        required: false
      }]
    });

    // 2. Nouvelles candidatures (aujourd'hui)
    const nouvellesCandidatures = await Candidature.count({
      where: {
        '$mission.employer_id$': userId,
        createdAt: { [Op.gte]: startOfDay }
      },
      include: [{ model: Mission, as: 'mission' }]
    });

    // 3. KPI
    const kpi = await this.calculateEmployeurKPI(userId);

    // 4. Messages non lus
    const unreadMessages = await Message.count({
      where: {
        conversation_id: {
          [Op.in]: await this.getUserConversations(userId)
        },
        sender_id: { [Op.ne]: userId },
        is_read: false
      }
    });

    const result = {
      missions_actives: missionsActives,
      nouvelles_candidatures: nouvellesCandidatures,
      kpi,
      unread_messages: unreadMessages,
      last_update: new Date()
    };

    await CacheService.set(cacheKey, result, 30);
    return result;
  }

  // ====================
  // DASHBOARD ADMIN
  // ====================
  static async getAdminDashboard() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const cacheKey = `dashboard:admin`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return cached;
    }

    // 1. Utilisateurs actifs (24h)
    const utilisateursActifs = await User.count({
      where: {
        last_login: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }
    });

    // 2. Nouvelles inscriptions (aujourd'hui)
    const nouvellesInscriptions = await User.count({
      where: {
        createdAt: { [Op.gte]: startOfDay }
      }
    });

    // 3. Missions en cours
    const missionsEnCours = await Mission.count({
      where: { status: 'en_cours' }
    });

    // 4. Revenus du mois
    const revenusMois = await Paiement.sum('montant', {
      where: {
        status: 'confirme',
        date_paiement: { [Op.between]: [startOfMonth, now] }
      }
    });

    // 5. Activité récente
    const recentActivity = await this.getAdminRecentActivity();

    const result = {
      stats: {
        utilisateurs_actifs: utilisateursActifs,
        nouvelles_inscriptions: nouvellesInscriptions,
        missions_en_cours: missionsEnCours,
        revenus_mois: revenusMois || 0
      },
      recent_activity: recentActivity,
      last_update: new Date()
    };

    await CacheService.set(cacheKey, result, 60);
    return result;
  }

  // ====================
  // MÉTHODES UTILITAIRES
  // ====================

  static async calculateDjKPI(userId, startDate, endDate) {
    // Missions acceptées
    const missionsAcceptees = await Mission.count({
      include: [{
        model: User,
        as: 'dj_selectionnes',
        where: { id: userId },
        through: { where: { status: 'confirme' } }
      }]
    });

    // Candidatures totales
    const candidatures = await Candidature.count({
      where: { dj_id: userId }
    });

    // Note moyenne
    const avis = await Avis.findAll({
      where: { cible_id: userId },
      attributes: [[sequelize.fn('AVG', sequelize.col('note')), 'moyenne']]
    });

    // Revenus du mois
    const revenus = await Paiement.sum('montant', {
      where: {
        dj_id: userId,
        status: 'confirme',
        date_paiement: { [Op.between]: [startDate, endDate] }
      }
    });

    return {
      missions_acceptees: missionsAcceptees,
      candidatures_total: candidatures,
      note_moyenne: parseFloat(avis[0]?.dataValues?.moyenne || 0).toFixed(1),
      revenus_mois: revenus || 0,
      taux_acceptation: candidatures > 0 ? Math.round((missionsAcceptees / candidatures) * 100) : 0
    };
  }

  static async calculateEmployeurKPI(userId) {
    const missionsPubliees = await Mission.count({
      where: { employer_id: userId }
    });

    const missionsAcceptees = await Mission.count({
      where: {
        employer_id: userId,
        status: 'terminee'
      }
    });

    const candidaturesRecues = await Candidature.count({
      include: [{
        model: Mission,
        as: 'mission',
        where: { employer_id: userId }
      }]
    });

    return {
      missions_publiees: missionsPubliees,
      missions_terminees: missionsAcceptees,
      candidatures_recues: candidaturesRecues,
      taux_succes: missionsPubliees > 0 ? Math.round((missionsAcceptees / missionsPubliees) * 100) : 0
    };
  }

  static async getRecentActivity(userId) {
    const limit = 5;
    const messages = await Message.findAll({
      where: {
        conversation_id: {
          [Op.in]: await this.getUserConversations(userId)
        }
      },
      order: [['createdAt', 'DESC']],
      limit,
      include: [{ model: User, as: 'sender', attributes: ['id', 'username', 'first_name', 'last_name'] }]
    });

    const candidatures = await Candidature.findAll({
      where: { dj_id: userId },
      order: [['createdAt', 'DESC']],
      limit,
      include: [{ model: Mission, as: 'mission', attributes: ['id', 'title'] }]
    });

    // Fusionner et trier par date
    const activities = [];
    messages.forEach(m => activities.push({ type: 'message', ...m.toJSON() }));
    candidatures.forEach(c => activities.push({ type: 'candidature', ...c.toJSON() }));

    return activities.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);
  }

  static async getUserConversations(userId) {
    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [
          { participant1_id: userId },
          { participant2_id: userId }
        ]
      },
      attributes: ['id']
    });
    return conversations.map(c => c.id);
  }

  static async getAdminRecentActivity() {
    const limit = 10;
    const users = await User.findAll({
      order: [['createdAt', 'DESC']],
      limit,
      attributes: ['id', 'username', 'first_name', 'last_name', 'createdAt', 'user_type']
    });

    const missions = await Mission.findAll({
      order: [['createdAt', 'DESC']],
      limit,
      include: [{ model: User, as: 'employer', attributes: ['id', 'username'] }]
    });

    const paiements = await Paiement.findAll({
      order: [['createdAt', 'DESC']],
      limit,
      include: [
        { model: User, as: 'employeur', attributes: ['id', 'username'] },
        { model: User, as: 'dj', attributes: ['id', 'username'] }
      ]
    });

    return {
      nouveaux_utilisateurs: users,
      nouvelles_missions: missions,
      paiements_recents: paiements
    };
  }
}

module.exports = DashboardService;