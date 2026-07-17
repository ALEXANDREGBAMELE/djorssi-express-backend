// src/services/mission.service.js
const { User } = require('../models/user.model');
const { CategoryMission } = require('../models/categorymission.model');
const { Mission } = require('../models/mission.model');
const { Candidature } = require('../models/candidature.model');
const { MissionDJ } = require('../models/mission_dj.model');
const { Paiement } = require('../models/paiement.model');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const NotificationService = require('./notification.service');
const CacheService = require('./cache.service');

/**
 * Créer une mission
 */
async function createMission(employerId, data) {
  try {
    // Vérifier que les dates sont valides
    if (data.date_mission && new Date(data.date_mission) < new Date()) {
      const err = new Error('La date de la mission doit être dans le futur');
      err.status = 400;
      throw err;
    }

    if (data.date_limite_candidature && new Date(data.date_limite_candidature) < new Date()) {
      const err = new Error('La date limite de candidature doit être dans le futur');
      err.status = 400;
      throw err;
    }

    if (data.date_limite_candidature && data.date_mission) {
      if (new Date(data.date_limite_candidature) > new Date(data.date_mission)) {
        const err = new Error('La date limite de candidature doit être avant la date de la mission');
        err.status = 400;
        throw err;
      }
    }

    // Créer la mission
    const mission = await Mission.create({
      ...data,
      employer_id: employerId,
      status: data.status || 'brouillon',
      nb_candidatures: 0,
      nb_djs_selectionnes: 0,
      dj_selectionnes_ids: []
    });

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');

    logger.info(`✅ Mission ${mission.id} créée par employeur ${employerId}`);

    // Recharger avec les relations
    const missionWithDetails = await Mission.findByPk(mission.id, {
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'first_name', 'last_name', 'company_name', 'profile_photo']
        },
        {
          model: CategoryMission,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        }
      ]
    });

    return missionWithDetails;
  } catch (error) {
    logger.error('Erreur createMission:', error);
    throw error;
  }
}

/**
 * Lister les missions avec filtres
 */
async function listMissions(filters = {}, userId = null, userRole = null) {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      ville,
      mission_type,
      status,
      category_id,
      date_debut,
      date_fin,
      budget_min,
      budget_max,
      sort_by = 'createdAt',
      sort_order = 'DESC',
      ...otherFilters
    } = filters;

    const offset = (page - 1) * limit;
    const where = { ...otherFilters };

    // Recherche textuelle
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { lieu: { [Op.iLike]: `%${search}%` } },
        { ville: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filtres simples
    if (ville) where.ville = ville;
    if (mission_type) where.mission_type = mission_type;
    if (status) where.status = status;
    if (category_id) where.category_id = category_id;

    // Filtre de date
    if (date_debut || date_fin) {
      where.date_mission = {};
      if (date_debut) where.date_mission[Op.gte] = new Date(date_debut);
      if (date_fin) where.date_mission[Op.lte] = new Date(date_fin);
    }

    // Filtre de budget
    if (budget_min || budget_max) {
      where.budget = {};
      if (budget_min) where.budget[Op.gte] = budget_min;
      if (budget_max) where.budget[Op.lte] = budget_max;
    }

    // Restriction selon le rôle
    if (userRole === 'employeur') {
      where.employer_id = userId;
    } else if (userRole === 'djorssi') {
      where.status = 'publiee';
      where.is_public = true;
    }
    // Admin voit tout

    // Trier
    const order = [[sort_by, sort_order]];

    // ✅ Version corrigée - separate: true UNIQUEMENT sur HasMany
    const { rows, count } = await Mission.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'first_name', 'last_name', 'company_name', 'profile_photo']
        },
        {
          model: CategoryMission,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: Candidature,
          as: 'candidatures',
          attributes: ['id', 'status', 'createdAt'],
          separate: true,  // ✅ OK - HasMany
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: User,
          as: 'dj_selectionnes',
          through: {
            attributes: ['status', 'remuneration_specifique']
          },
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
          // ✅ separate: true SUPPRIMÉ (BelongsToMany)
        }
      ]
    });

    // Formater la réponse
    const result = {
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };

    return result;
  } catch (error) {
    logger.error('Erreur listMissions:', error);
    throw error;
  }
}

/**
 * Récupérer une mission par ID
 */
async function getMissionById(id, userId = null, userRole = null) {
  try {
    // Vérifier le cache
    const cacheKey = `cache:mission:${id}`;
    const cached = await CacheService.get(cacheKey);
    if (cached && userId === null) {
      return cached;
    }

    // ✅ Version corrigée - separate: true UNIQUEMENT sur HasMany
    const mission = await Mission.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'first_name', 'last_name', 'company_name', 'profile_photo', 'phone', 'email']
        },
        {
          model: CategoryMission,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: Candidature,
          as: 'candidatures',
          include: [
            {
              model: User,
              as: 'dj',
              attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone']
            }
          ],
          separate: true,  // ✅ OK - HasMany
          limit: 20,
          order: [['createdAt', 'DESC']]
        },
        {
          model: User,
          as: 'dj_selectionnes',
          through: {
            attributes: ['status', 'remuneration_specifique', 'notes_specifiques', 'date_confirmation']
          },
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone', 'email']
          // ✅ separate: true SUPPRIMÉ (BelongsToMany)
        }
      ]
    });

    if (!mission) {
      const err = new Error('Mission introuvable');
      err.status = 404;
      throw err;
    }

    // Vérifier les permissions d'accès
    if (userRole === 'djorssi' && mission.status !== 'publiee') {
      const err = new Error('Vous ne pouvez pas voir cette mission');
      err.status = 403;
      throw err;
    }

    if (userRole === 'employeur' && mission.employer_id !== userId && mission.status === 'brouillon') {
      const err = new Error('Vous ne pouvez pas voir cette mission');
      err.status = 403;
      throw err;
    }

    // Mettre en cache
    if (userId === null) {
      await CacheService.set(cacheKey, mission, 300);
    }

    return mission;
  } catch (error) {
    logger.error('Erreur getMissionById:', error);
    throw error;
  }
}

/**
 * Mettre à jour une mission
 */
async function updateMission(id, userId, data, userRole = 'employeur') {
  try {
    // 1. Vérifier que la mission existe
    const mission = await Mission.findByPk(id);
    if (!mission) {
      const err = new Error('Mission introuvable');
      err.status = 404;
      throw err;
    }

    // 2. Vérifier les autorisations
    const isAdmin = userRole === 'admin';
    const isOwner = mission.employer_id === userId;

    if (!isAdmin && !isOwner) {
      const err = new Error("Vous n'êtes pas autorisé à modifier cette mission");
      err.status = 403;
      throw err;
    }

    // 3. Vérifier les transitions de statut
    const allowedStatusTransitions = {
      'brouillon': ['publiee', 'annulee'],
      'publiee': ['en_cours', 'annulee', 'expiree'],
      'en_cours': ['terminee', 'annulee'],
      'terminee': [],
      'annulee': [],
      'expiree': []
    };

    if (data.status && data.status !== mission.status) {
      const allowed = allowedStatusTransitions[mission.status] || [];
      if (!allowed.includes(data.status)) {
        const err = new Error(`Transition de statut invalide: ${mission.status} → ${data.status}`);
        err.status = 400;
        throw err;
      }

      await validateStatusTransition(mission, data.status, id);
    }

    // 4. Vérifier les dates
    if (data.date_limite_candidature) {
      const newDate = new Date(data.date_limite_candidature);
      if (newDate < new Date()) {
        const err = new Error('La date limite de candidature doit être dans le futur');
        err.status = 400;
        throw err;
      }
    }

    if (data.date_mission) {
      const newDate = new Date(data.date_mission);
      if (newDate < new Date()) {
        const err = new Error('La date de la mission doit être dans le futur');
        err.status = 400;
        throw err;
      }
    }

    // 5. Vérifier le nombre de DJs requis
    if (data.nb_djs_requis) {
      const currentSelected = await MissionDJ.count({
        where: {
          mission_id: id,
          status: 'confirme'
        }
      });

      if (data.nb_djs_requis < currentSelected) {
        const err = new Error(`Impossible de réduire le nombre de DJs requis (${currentSelected} DJs déjà sélectionnés)`);
        err.status = 400;
        throw err;
      }
    }

    // 6. Restrictions pour les missions publiées
    if (mission.status === 'publiee' && data.status !== 'annulee') {
      const allowedFields = ['title', 'description', 'budget', 'budget_negociable', 'remuneration_details'];
      const updateData = {};
      
      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }
      
      if (data.status) {
        updateData.status = data.status;
      }

      data = updateData;
    }

    // 7. Restrictions pour les missions en cours
    if (mission.status === 'en_cours') {
      const disallowedFields = ['date_mission', 'date_limite_candidature', 'nb_djs_requis', 'budget'];
      for (const field of disallowedFields) {
        if (data[field] !== undefined && data[field] !== mission[field]) {
          const err = new Error(`Le champ "${field}" ne peut pas être modifié pour une mission en cours`);
          err.status = 400;
          throw err;
        }
      }
    }

    // 8. Mettre à jour
    await mission.update(data);

    // 9. Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${id}`);

    // 10. Notifications
    if (data.status === 'publiee' && mission.status !== 'publiee') {
      await notifyDJsOnPublish(mission);
    }

    if (data.status === 'terminee' && mission.status !== 'terminee') {
      await notifyCompletion(mission);
    }

    // 11. Recharger la mission
    const updatedMission = await Mission.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'first_name', 'last_name', 'company_name', 'profile_photo']
        },
        {
          model: CategoryMission,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: Candidature,
          as: 'candidatures',
          limit: 5,
          order: [['createdAt', 'DESC']]
        },
        {
          model: User,
          as: 'dj_selectionnes',
          through: {
            attributes: ['status', 'remuneration_specifique']
          },
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
          // ✅ separate: true SUPPRIMÉ
        }
      ]
    });

    logger.info(`✅ Mission ${id} mise à jour par utilisateur ${userId}`);
    return updatedMission;
  } catch (error) {
    logger.error('Erreur updateMission:', error);
    throw error;
  }
}

/**
 * Supprimer une mission (soft delete)
 */
async function deleteMission(id, userId, userRole = 'employeur') {
  try {
    const mission = await Mission.findByPk(id, {
      include: [
        {
          model: Candidature,
          as: 'candidatures',
          where: { status: 'en_attente' },
          required: false
        },
        {
          model: MissionDJ,
          as: 'dj_selectionnes',
          where: { status: ['selectionne', 'confirme'] },
          required: false
        },
        {
          model: Paiement,
          as: 'paiements',
          where: { status: 'en_attente' },
          required: false
        }
      ]
    });

    if (!mission) {
      const err = new Error('Mission introuvable');
      err.status = 404;
      throw err;
    }

    // Vérifier les autorisations
    const isAdmin = userRole === 'admin';
    const isOwner = mission.employer_id === userId;

    if (!isAdmin && !isOwner) {
      const err = new Error("Vous n'êtes pas autorisé à supprimer cette mission");
      err.status = 403;
      throw err;
    }

    // Vérifier qu'il n'y a pas de candidatures en attente
    if (mission.candidatures && mission.candidatures.length > 0) {
      const err = new Error('Impossible de supprimer une mission avec des candidatures en attente');
      err.status = 400;
      throw err;
    }

    // Vérifier qu'il n'y a pas de DJs sélectionnés
    if (mission.dj_selectionnes && mission.dj_selectionnes.length > 0) {
      const err = new Error('Impossible de supprimer une mission avec des DJs sélectionnés');
      err.status = 400;
      throw err;
    }

    // Vérifier qu'il n'y a pas de paiements en attente
    if (mission.paiements && mission.paiements.length > 0) {
      const err = new Error('Impossible de supprimer une mission avec des paiements en attente');
      err.status = 400;
      throw err;
    }

    // Soft delete
    await mission.destroy();

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${id}`);

    logger.info(`✅ Mission ${id} supprimée par utilisateur ${userId}`);
    return true;
  } catch (error) {
    logger.error('Erreur deleteMission:', error);
    throw error;
  }
}

/**
 * Publier une mission
 */
async function publishMission(id, userId) {
  try {
    const mission = await Mission.findByPk(id);
    if (!mission) {
      const err = new Error('Mission introuvable');
      err.status = 404;
      throw err;
    }

    // Vérifier les autorisations
    if (mission.employer_id !== userId) {
      const err = new Error("Vous n'êtes pas autorisé à publier cette mission");
      err.status = 403;
      throw err;
    }

    // Vérifier que la mission est en brouillon
    if (mission.status !== 'brouillon') {
      const err = new Error('Seules les missions en brouillon peuvent être publiées');
      err.status = 400;
      throw err;
    }

    // Vérifier que la date limite est dans le futur
    if (new Date(mission.date_limite_candidature) < new Date()) {
      const err = new Error('La date limite de candidature est déjà passée');
      err.status = 400;
      throw err;
    }

    // Vérifier que la mission est complète
    const requiredFields = ['title', 'description', 'date_mission', 'date_limite_candidature', 'ville', 'lieu'];
    for (const field of requiredFields) {
      if (!mission[field]) {
        const err = new Error(`Le champ "${field}" est requis pour publier la mission`);
        err.status = 400;
        throw err;
      }
    }

    // Publier
    await mission.update({ status: 'publiee' });

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${id}`);

    // Notifier les DJs
    await notifyDJsOnPublish(mission);

    logger.info(`✅ Mission ${id} publiée par utilisateur ${userId}`);
    return mission;
  } catch (error) {
    logger.error('Erreur publishMission:', error);
    throw error;
  }
}

// ====================
// FONCTIONS DE VALIDATION
// ====================

async function validateStatusTransition(mission, newStatus, missionId) {
  switch (newStatus) {
    case 'publiee':
      // Vérifier que la mission est complète
      const requiredFields = ['title', 'description', 'date_mission', 'date_limite_candidature', 'ville', 'lieu'];
      for (const field of requiredFields) {
        if (!mission[field]) {
          const err = new Error(`Le champ "${field}" est requis pour publier la mission`);
          err.status = 400;
          throw err;
        }
      }
      break;

    case 'en_cours':
      // Vérifier qu'il y a des DJs sélectionnés
      const selectedDJs = await MissionDJ.count({
        where: {
          mission_id: missionId,
          status: 'selectionne'
        }
      });

      if (selectedDJs === 0) {
        const err = new Error('Au moins un DJ doit être sélectionné pour passer en "en cours"');
        err.status = 400;
        throw err;
      }

      if (selectedDJs < mission.nb_djs_requis) {
        const err = new Error(`Il faut ${mission.nb_djs_requis} DJs, mais seulement ${selectedDJs} sont sélectionnés`);
        err.status = 400;
        throw err;
      }
      break;

    case 'terminee':
      // Vérifier que la mission a eu lieu
      if (new Date(mission.date_mission) > new Date()) {
        const err = new Error('La mission ne peut pas être terminée avant sa date');
        err.status = 400;
        throw err;
      }

      const confirmedDJs = await MissionDJ.count({
        where: {
          mission_id: missionId,
          status: 'confirme'
        }
      });

      if (confirmedDJs === 0) {
        const err = new Error('Au moins un DJ doit être confirmé pour terminer la mission');
        err.status = 400;
        throw err;
      }
      break;
  }
}

// ====================
// FONCTIONS DE NOTIFICATION
// ====================

async function notifyDJsOnPublish(mission) {
  try {
    const djs = await User.findAll({
      where: {
        user_type: 'djorssi',
        is_active: true
      },
      limit: 100
    });

    for (const dj of djs) {
      await NotificationService.create(
        dj.id,
        'nouvelle_mission',
        'Nouvelle mission disponible 🎵',
        `Une nouvelle mission "${mission.title}" vient d'être publiée dans votre région`,
        `/missions/${mission.id}`,
        { mission_id: mission.id }
      );
    }

    logger.info(`📢 ${djs.length} DJs notifiés pour la mission ${mission.id}`);
  } catch (error) {
    logger.error('Erreur notification DJs:', error);
  }
}

async function notifyCompletion(mission) {
  try {
    const selectedDJs = await MissionDJ.findAll({
      where: {
        mission_id: mission.id,
        status: ['selectionne', 'confirme']
      },
      include: [{ model: User, as: 'dj' }]
    });

    for (const selection of selectedDJs) {
      await NotificationService.create(
        selection.dj_id,
        'mission_terminee',
        'Mission terminée ✅',
        `La mission "${mission.title}" est terminée. N'oubliez pas de laisser un avis !`,
        `/missions/${mission.id}`,
        { mission_id: mission.id }
      );
    }

    logger.info(`📢 ${selectedDJs.length} DJs notifiés pour la fin de la mission ${mission.id}`);
  } catch (error) {
    logger.error('Erreur notification fin de mission:', error);
  }
}

module.exports = {
  createMission,
  listMissions,
  getMissionById,
  updateMission,
  deleteMission,
  publishMission
};