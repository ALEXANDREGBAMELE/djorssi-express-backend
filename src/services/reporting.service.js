// src/services/reporting.service.js
const { User, Mission, Candidature, Avis, Paiement, Notification } = require('../models');
const { Op, sequelize } = require('sequelize');
const logger = require('../../config/logger');

class ReportingService {
  // ====================
  // RAPPORT DJ
  // ====================
  static async getDjReport(userId, period) {
    const { startDate, endDate, groupBy } = this.parsePeriod(period);
    const cacheKey = `report:dj:${userId}:${period}`;

    // 1. Statistiques globales
    const stats = await this.getDjStats(userId, startDate, endDate);

    // 2. Évolution des missions
    const evolution = await this.getDjEvolution(userId, startDate, endDate, groupBy);

    // 3. Détail des missions
    const missions = await this.getDjMissions(userId, startDate, endDate);

    // 4. Évaluations reçues
    const avis = await this.getDjAvis(userId, startDate, endDate);

    // 5. Revenus détaillés
    const revenus = await this.getDjRevenus(userId, startDate, endDate);

    // 6. Recommandations
    const recommendations = this.generateDjRecommendations(stats);

    return {
      user_id: userId,
      period: { startDate, endDate },
      generated_at: new Date(),
      stats,
      evolution,
      missions,
      avis: avis.rows,
      avis_stats: avis.stats,
      revenus,
      recommendations
    };
  }

  // ====================
  // RAPPORT EMPLOYEUR
  // ====================
  static async getEmployeurReport(userId, period) {
    const { startDate, endDate, groupBy } = this.parsePeriod(period);

    // 1. Statistiques globales
    const stats = await this.getEmployeurStats(userId, startDate, endDate);

    // 2. Évolution des missions
    const evolution = await this.getEmployeurEvolution(userId, startDate, endDate, groupBy);

    // 3. Missions détaillées
    const missions = await this.getEmployeurMissions(userId, startDate, endDate);

    // 4. Candidatures reçues
    const candidatures = await this.getEmployeurCandidatures(userId, startDate, endDate);

    // 5. Analyse des DJs
    const djAnalysis = await this.getDjAnalysis(userId, startDate, endDate);

    // 6. Dépenses
    const depenses = await this.getEmployeurDepenses(userId, startDate, endDate);

    return {
      user_id: userId,
      period: { startDate, endDate },
      generated_at: new Date(),
      stats,
      evolution,
      missions,
      candidatures,
      dj_analysis: djAnalysis,
      depenses,
      recommendations: this.generateEmployeurRecommendations(stats)
    };
  }

  // ====================
  // RAPPORT ADMIN
  // ====================
  static async getAdminReport(period, filters = {}) {
    const { startDate, endDate, groupBy } = this.parsePeriod(period);

    // 1. Vue d'ensemble
    const overview = await this.getAdminOverview(startDate, endDate);

    // 2. Croissance utilisateurs
    const userGrowth = await this.getUserGrowth(startDate, endDate, groupBy);

    // 3. Activité missions
    const missionActivity = await this.getMissionActivity(startDate, endDate, groupBy);

    // 4. Revenus
    const revenues = await this.getAdminRevenus(startDate, endDate, groupBy);

    // 5. KPI clés
    const kpis = await this.getAdminKPIs(startDate, endDate);

    // 6. Top performers
    const topPerformers = await this.getTopPerformers(startDate, endDate);

    return {
      generated_at: new Date(),
      period: { startDate, endDate },
      filters,
      overview,
      user_growth: userGrowth,
      mission_activity: missionActivity,
      revenues,
      kpis,
      top_performers: topPerformers,
      recommendations: this.generateAdminRecommendations(kpis)
    };
  }

  // ====================
  // MÉTHODES DE CALCUL
  // ====================

  static async getDjStats(userId, startDate, endDate) {
    const missions = await Mission.findAndCountAll({
      where: {
        '$dj_selectionnes.id$': userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      include: [{ model: User, as: 'dj_selectionnes' }]
    });

    const candidatures = await Candidature.findAndCountAll({
      where: {
        dj_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });

    const avis = await Avis.findAll({
      where: {
        cible_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['note']
    });

    const paiements = await Paiement.findAll({
      where: {
        dj_id: userId,
        status: 'confirme',
        date_paiement: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['montant']
    });

    const notes = avis.map(a => parseFloat(a.note));
    const avgNote = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;

    return {
      missions_total: missions.count,
      candidatures_total: candidatures.count,
      taux_succes: candidatures.count > 0 ? Math.round((missions.count / candidatures.count) * 100) : 0,
      note_moyenne: parseFloat(avgNote).toFixed(1),
      revenus_total: paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0),
      nb_avis: avis.length
    };
  }

  static async getEmployeurStats(userId, startDate, endDate) {
    const missions = await Mission.findAndCountAll({
      where: {
        employer_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });

    const missionsTerminees = await Mission.count({
      where: {
        employer_id: userId,
        status: 'terminee',
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });

    const candidatures = await Candidature.count({
      include: [{
        model: Mission,
        as: 'mission',
        where: {
          employer_id: userId,
          createdAt: { [Op.between]: [startDate, endDate] }
        }
      }]
    });

    const paiements = await Paiement.sum('montant', {
      where: {
        employeur_id: userId,
        status: 'confirme',
        date_paiement: { [Op.between]: [startDate, endDate] }
      }
    });

    return {
      missions_publices: missions.count,
      missions_terminees: missionsTerminees,
      candidatures_recues: candidatures,
      depenses_total: paiements || 0,
      taux_succes: missions.count > 0 ? Math.round((missionsTerminees / missions.count) * 100) : 0
    };
  }

  static async getDjEvolution(userId, startDate, endDate, groupBy) {
    const grouping = this.getGrouping(groupBy);
    const query = `
      SELECT 
        DATE_TRUNC('${grouping}', created_at) as period,
        COUNT(*) as count,
        SUM(budget) as budget
      FROM missions
      WHERE 
        id IN (
          SELECT mission_id FROM mission_djs WHERE dj_id = :userId AND status = 'confirme'
        )
        AND created_at BETWEEN :startDate AND :endDate
      GROUP BY period
      ORDER BY period ASC
    `;

    const results = await sequelize.query(query, {
      replacements: { userId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }

  static async getEmployeurEvolution(userId, startDate, endDate, groupBy) {
    const grouping = this.getGrouping(groupBy);
    const query = `
      SELECT 
        DATE_TRUNC('${grouping}', created_at) as period,
        COUNT(*) as count,
        SUM(budget) as budget
      FROM missions
      WHERE 
        employer_id = :userId
        AND created_at BETWEEN :startDate AND :endDate
      GROUP BY period
      ORDER BY period ASC
    `;

    const results = await sequelize.query(query, {
      replacements: { userId, startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return results;
  }

  // ====================
  // MÉTHODES ADMIN
  // ====================
  static async getAdminOverview(startDate, endDate) {
    const [users, missions, candidatures, paiements] = await Promise.all([
      User.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } }),
      Mission.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } }),
      Candidature.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } }),
      Paiement.sum('montant', {
        where: {
          status: 'confirme',
          date_paiement: { [Op.between]: [startDate, endDate] }
        }
      })
    ]);

    return {
      nouveaux_utilisateurs: users,
      nouvelles_missions: missions,
      nouvelles_candidatures: candidatures,
      revenus_total: paiements || 0
    };
  }

  static async getAdminKPIs(startDate, endDate) {
    // Taux de conversion (inscription → mission)
    const users = await User.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } });
    const missions = await Mission.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } });

    // Taux d'acceptation des candidatures
    const candidatures = await Candidature.count({
      where: { createdAt: { [Op.between]: [startDate, endDate] } }
    });
    const candidaturesAcceptees = await Candidature.count({
      where: {
        status: 'acceptee',
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });

    // Note moyenne
    const avis = await Avis.findAll({
      where: { createdAt: { [Op.between]: [startDate, endDate] } },
      attributes: [[sequelize.fn('AVG', sequelize.col('note')), 'moyenne']]
    });

    return {
      conversion_users_to_missions: users > 0 ? Math.round((missions / users) * 100) : 0,
      taux_acceptation: candidatures > 0 ? Math.round((candidaturesAcceptees / candidatures) * 100) : 0,
      note_moyenne: parseFloat(avis[0]?.dataValues?.moyenne || 0).toFixed(1),
      ratio_dj_employeur: await this.getDjEmployeurRatio(),
      taux_retention: await this.getRetentionRate()
    };
  }

  // ====================
  // MÉTHODES UTILITAIRES
  // ====================

  static parsePeriod(period) {
    const now = new Date();
    let startDate, endDate, groupBy;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate = now;
        groupBy = 'hour';
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        endDate = now;
        groupBy = 'day';
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        groupBy = 'day';
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        endDate = now;
        groupBy = 'week';
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        groupBy = 'month';
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        groupBy = 'day';
    }

    return { startDate, endDate, groupBy };
  }

  static getGrouping(groupBy) {
    const mappings = {
      hour: 'hour',
      day: 'day',
      week: 'week',
      month: 'month',
      quarter: 'quarter',
      year: 'year'
    };
    return mappings[groupBy] || 'day';
  }

  static async getDjEmployeurRatio() {
    const result = await User.findAll({
      attributes: [
        'user_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['user_type']
    });
    return result;
  }

  static async getRetentionRate() {
    // Utilisateurs actifs dans les 30 derniers jours / utilisateurs total
    const total = await User.count();
    const actifs = await User.count({
      where: {
        last_login: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    });
    return total > 0 ? Math.round((actifs / total) * 100) : 0;
  }

  static generateDjRecommendations(stats) {
    const recommendations = [];
    if (stats.taux_succes < 50) {
      recommendations.push('📈 Améliorez votre taux d\'acceptation en personnalisant vos candidatures');
    }
    if (stats.note_moyenne < 4) {
      recommendations.push('⭐ Travaillez votre professionnalisme et votre ponctualité');
    }
    if (stats.missions_total > 0 && stats.revenus_total < 100000) {
      recommendations.push('💰 Augmentez vos tarifs ou postulez à des missions mieux rémunérées');
    }
    if (stats.nb_avis < 5) {
      recommendations.push('📝 Demandez à vos employeurs de laisser un avis pour améliorer votre crédibilité');
    }
    return recommendations;
  }

  static generateEmployeurRecommendations(stats) {
    const recommendations = [];
    if (stats.missions_publices > 0 && stats.candidatures_recues < 5) {
      recommendations.push('📢 Améliorez la description de vos missions pour attirer plus de candidats');
    }
    if (stats.taux_succes < 50) {
      recommendations.push('🎯 Affinez vos critères de sélection et votre processus de recrutement');
    }
    return recommendations;
  }

  static generateAdminRecommendations(kpis) {
    const recommendations = [];
    if (kpis.conversion_users_to_missions < 10) {
      recommendations.push('🚀 Les utilisateurs ne publient pas assez de missions. Lancez une campagne d\'activation');
    }
    if (kpis.taux_retention < 30) {
      recommendations.push('🔄 Améliorez la rétention des utilisateurs avec des notifications et des rappels');
    }
    return recommendations;
  }

  // ====================
  // EXPORT
  // ====================

  static async getDjMissions(userId, startDate, endDate) {
    return await Mission.findAll({
      where: {
        '$dj_selectionnes.id$': userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: User, as: 'employer', attributes: ['id', 'username', 'first_name', 'last_name'] },
        { model: User, as: 'dj_selectionnes', through: { attributes: ['status', 'remuneration_specifique'] } },
        { model: Candidature, as: 'candidatures', where: { dj_id: userId }, required: false }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  static async getDjAvis(userId, startDate, endDate) {
    const avis = await Avis.findAndCountAll({
      where: {
        cible_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: User, as: 'auteur', attributes: ['id', 'username', 'first_name', 'last_name'] },
        { model: Mission, as: 'mission', attributes: ['id', 'title'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    const stats = await Avis.findAll({
      where: {
        cible_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('note')), 'moyenne'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('MAX', sequelize.col('note')), 'max'],
        [sequelize.fn('MIN', sequelize.col('note')), 'min']
      ]
    });

    return {
      rows: avis.rows,
      stats: stats[0]?.dataValues || { moyenne: 0, total: 0, max: 0, min: 0 }
    };
  }

  static async getDjRevenus(userId, startDate, endDate) {
    const paiements = await Paiement.findAll({
      where: {
        dj_id: userId,
        status: 'confirme',
        date_paiement: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Mission, as: 'mission', attributes: ['id', 'title'] },
        { model: User, as: 'employeur', attributes: ['id', 'username'] }
      ],
      order: [['date_paiement', 'DESC']]
    });

    const total = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0);
    const moyenne = paiements.length > 0 ? total / paiements.length : 0;

    return {
      total,
      moyenne,
      paiements
    };
  }

  static async getEmployeurMissions(userId, startDate, endDate) {
    return await Mission.findAll({
      where: {
        employer_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: Candidature, as: 'candidatures' },
        { model: User, as: 'dj_selectionnes', through: { attributes: ['status', 'remuneration_specifique'] } }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  static async getEmployeurCandidatures(userId, startDate, endDate) {
    const missions = await Mission.findAll({
      where: {
        employer_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['id']
    });
    const missionIds = missions.map(m => m.id);

    return await Candidature.findAll({
      where: {
        mission_id: { [Op.in]: missionIds },
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: User, as: 'dj', attributes: ['id', 'username', 'first_name', 'last_name'] },
        { model: Mission, as: 'mission', attributes: ['id', 'title'] }
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  static async getDjAnalysis(userId, startDate, endDate) {
    const missions = await Mission.findAll({
      where: {
        employer_id: userId,
        createdAt: { [Op.between]: [startDate, endDate] }
      },
      attributes: ['id']
    });
    const missionIds = missions.map(m => m.id);

    // Top DJs par nombre de missions
    const topDjs = await sequelize.query(`
      SELECT 
        dj_id,
        users.username,
        users.first_name,
        users.last_name,
        COUNT(*) as mission_count,
        AVG(candidatures.note_employeur) as avg_note
      FROM mission_djs
      JOIN users ON users.id = mission_djs.dj_id
      LEFT JOIN candidatures ON candidatures.mission_id = mission_djs.mission_id AND candidatures.dj_id = mission_djs.dj_id
      WHERE mission_djs.mission_id IN (:missionIds)
        AND mission_djs.status = 'confirme'
      GROUP BY dj_id, users.username, users.first_name, users.last_name
      ORDER BY mission_count DESC
    `, {
      replacements: { missionIds },
      type: sequelize.QueryTypes.SELECT
    });

    return topDjs;
  }

  static async getEmployeurDepenses(userId, startDate, endDate) {
    const paiements = await Paiement.findAll({
      where: {
        employeur_id: userId,
        status: 'confirme',
        date_paiement: { [Op.between]: [startDate, endDate] }
      },
      include: [
        { model: User, as: 'dj', attributes: ['id', 'username', 'first_name', 'last_name'] },
        { model: Candidature, as: 'candidature', include: [{ model: Mission, as: 'mission', attributes: ['id', 'title'] }] }
      ],
      order: [['date_paiement', 'DESC']]
    });

    const total = paiements.reduce((sum, p) => sum + parseFloat(p.montant), 0);
    const moyenne = paiements.length > 0 ? total / paiements.length : 0;

    return {
      total,
      moyenne,
      paiements
    };
  }

  static async getUserGrowth(startDate, endDate, groupBy) {
    const grouping = this.getGrouping(groupBy);
    const query = `
      SELECT 
        DATE_TRUNC('${grouping}', created_at) as period,
        COUNT(*) as count
      FROM users
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY period
      ORDER BY period ASC
    `;

    return await sequelize.query(query, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
  }

  static async getMissionActivity(startDate, endDate, groupBy) {
    const grouping = this.getGrouping(groupBy);
    const query = `
      SELECT 
        DATE_TRUNC('${grouping}', created_at) as period,
        COUNT(*) as count,
        COUNT(DISTINCT employer_id) as unique_employers,
        SUM(budget) as total_budget
      FROM missions
      WHERE created_at BETWEEN :startDate AND :endDate
      GROUP BY period
      ORDER BY period ASC
    `;

    return await sequelize.query(query, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
  }

  static async getAdminRevenus(startDate, endDate, groupBy) {
    const grouping = this.getGrouping(groupBy);
    const query = `
      SELECT 
        DATE_TRUNC('${grouping}', date_paiement) as period,
        SUM(montant) as total,
        COUNT(*) as count,
        AVG(montant) as moyenne
      FROM paiements
      WHERE 
        status = 'confirme'
        AND date_paiement BETWEEN :startDate AND :endDate
      GROUP BY period
      ORDER BY period ASC
    `;

    return await sequelize.query(query, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });
  }

  static async getTopPerformers(startDate, endDate) {
    // Top DJs par revenus
    const topDjs = await sequelize.query(`
      SELECT 
        dj_id,
        users.username,
        users.first_name,
        users.last_name,
        SUM(montant) as total_revenue,
        COUNT(*) as mission_count
      FROM paiements
      JOIN users ON users.id = paiements.dj_id
      WHERE 
        paiements.status = 'confirme'
        AND date_paiement BETWEEN :startDate AND :endDate
      GROUP BY dj_id, users.username, users.first_name, users.last_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    // Top employeurs par dépenses
    const topEmployeurs = await sequelize.query(`
      SELECT 
        employeur_id,
        users.username,
        users.first_name,
        users.last_name,
        SUM(montant) as total_spent,
        COUNT(*) as mission_count
      FROM paiements
      JOIN users ON users.id = paiements.employeur_id
      WHERE 
        paiements.status = 'confirme'
        AND date_paiement BETWEEN :startDate AND :endDate
      GROUP BY employeur_id, users.username, users.first_name, users.last_name
      ORDER BY total_spent DESC
      LIMIT 10
    `, {
      replacements: { startDate, endDate },
      type: sequelize.QueryTypes.SELECT
    });

    return { topDjs, topEmployeurs };
  }
}

module.exports = ReportingService;