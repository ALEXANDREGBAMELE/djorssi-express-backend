// src/controllers/mission.controller.js
const { Mission, Candidature, User, MissionDJ, CategoryMission } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { hasPermission } = require('../../config/permissions');
const CacheService = require('../services/cache.service');
const NotificationService = require('../services/notification.service');
const {
  createMissionSchema,
  updateMissionSchema,
  candidatureSchema,
  missionQuerySchema,
  idParamSchema,
  selectionnerDJsSchema,
  confirmerDJSchema
} = require('../validators/mission.validator');

// ====================
// FONCTIONS PUBLIQUES
// ====================

// Récupérer toutes les missions avec filtres
const getAllMissions = async (req, res, next) => {
  try {
    const result = missionQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

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
      sort_order = 'DESC'
    } = result.data;

    // Vérifier le cache
    const cacheKey = `cache:missions:${JSON.stringify(req.query)}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      return res.json({
        success: true,
        data: cached
      });
    }

    const where = {};

    // Filtrer les missions selon le rôle
    if (req.user.user_type === 'employeur') {
      where.employer_id = req.user.id;
    } else if (req.user.user_type === 'djorssi') {
      where.status = 'publiee';
      where.is_public = true;
    }
    // Admin voit tout

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { lieu: { [Op.iLike]: `%${search}%` } },
        { ville: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (ville) where.ville = ville;
    if (mission_type) where.mission_type = mission_type;
    if (status) where.status = status;
    if (category_id) where.category_id = category_id;

    if (date_debut || date_fin) {
      where.date_mission = {};
      if (date_debut) where.date_mission[Op.gte] = new Date(date_debut);
      if (date_fin) where.date_mission[Op.lte] = new Date(date_fin);
    }

    if (budget_min || budget_max) {
      where.budget = {};
      if (budget_min) where.budget[Op.gte] = budget_min;
      if (budget_max) where.budget[Op.lte] = budget_max;
    }

    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_order]];

    // ✅ Version corrigée - separate: true UNIQUEMENT sur HasMany
    const { count, rows } = await Mission.findAndCountAll({
      where,
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
          attributes: ['id', 'dj_id', 'status', 'createdAt'],
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
          // ✅ separate: true SUPPRIMÉ
        }
      ],
      order,
      limit: parseInt(limit),
      offset
    });

    const resultData = {
      missions: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };

    // Mettre en cache pour 5 minutes
    await CacheService.set(cacheKey, resultData, 300);

    res.json({
      success: true,
      data: resultData
    });
  } catch (error) {
    logger.error('Erreur getAllMissions:', error);
    next(error);
  }
};

// Récupérer une mission par ID
const getMissionById = async (req, res, next) => {
  try {
    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { id } = req.params;

    // Vérifier le cache
    const cacheKey = `cache:mission:${id}`;
    const cached = await CacheService.get(cacheKey);
    if (cached) {
      const userRole = req.user.user_type;
      if (userRole === 'djorssi' && cached.status !== 'publiee') {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas voir cette mission'
        });
      }
      if (userRole === 'employeur' && cached.employer_id !== req.user.id && cached.status === 'brouillon') {
        return res.status(403).json({
          success: false,
          message: 'Vous ne pouvez pas voir cette mission'
        });
      }
      return res.json({
        success: true,
        data: { mission: cached }
      });
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
          // ✅ separate: true SUPPRIMÉ
        }
      ]
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    // Vérifier les permissions d'accès
    const userRole = req.user.user_type;
    if (userRole === 'djorssi' && mission.status !== 'publiee') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas voir cette mission'
      });
    }

    if (userRole === 'employeur' && mission.employer_id !== req.user.id && mission.status === 'brouillon') {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas voir cette mission'
      });
    }

    // Mettre en cache pour 5 minutes
    await CacheService.set(cacheKey, mission, 300);

    res.json({
      success: true,
      data: { mission }
    });
  } catch (error) {
    logger.error('Erreur getMissionById:', error);
    next(error);
  }
};

// ====================
// FONCTIONS EMPLOYEUR
// ====================

// Créer une mission
const createMission = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, 'mission.create')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de créer une mission'
      });
    }

    const result = createMissionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const missionData = {
      ...result.data,
      employer_id: req.user.id,
      status: result.data.status || 'brouillon',
      nb_djs_selectionnes: 0,
      dj_selectionnes_ids: []
    };

    const mission = await Mission.create(missionData);

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');

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

    res.status(201).json({
      success: true,
      message: 'Mission créée avec succès',
      data: { mission: missionWithDetails }
    });
  } catch (error) {
    logger.error('Erreur createMission:', error);
    next(error);
  }
};

// Mettre à jour une mission
const updateMission = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, 'mission.update')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de modifier une mission'
      });
    }

    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = updateMissionSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    if (mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à modifier cette mission'
      });
    }

    // Vérifier les transitions de statut
    if (result.data.status && result.data.status !== mission.status) {
      const allowedTransitions = {
        'brouillon': ['publiee', 'annulee'],
        'publiee': ['en_cours', 'annulee', 'expiree'],
        'en_cours': ['terminee', 'annulee'],
        'terminee': [],
        'annulee': [],
        'expiree': []
      };

      const allowed = allowedTransitions[mission.status] || [];
      if (!allowed.includes(result.data.status)) {
        return res.status(400).json({
          success: false,
          message: `Transition de statut invalide: ${mission.status} → ${result.data.status}`
        });
      }

      // Vérifications spécifiques selon le statut
      if (result.data.status === 'publiee' && mission.status === 'brouillon') {
        // Vérifier que la mission est complète
        const requiredFields = ['title', 'description', 'date_mission', 'date_limite_candidature', 'ville', 'lieu'];
        for (const field of requiredFields) {
          if (!mission[field]) {
            return res.status(400).json({
              success: false,
              message: `Le champ "${field}" est requis pour publier la mission`
            });
          }
        }
      }

      if (result.data.status === 'en_cours') {
        const selectedDJs = await MissionDJ.count({
          where: {
            mission_id: mission.id,
            status: 'selectionne'
          }
        });
        if (selectedDJs < mission.nb_djs_requis) {
          return res.status(400).json({
            success: false,
            message: `Il faut ${mission.nb_djs_requis} DJs, mais seulement ${selectedDJs} sont sélectionnés`
          });
        }
      }

      if (result.data.status === 'terminee') {
        if (new Date(mission.date_mission) > new Date()) {
          return res.status(400).json({
            success: false,
            message: 'La mission ne peut pas être terminée avant sa date'
          });
        }
        const confirmedDJs = await MissionDJ.count({
          where: {
            mission_id: mission.id,
            status: 'confirme'
          }
        });
        if (confirmedDJs === 0) {
          return res.status(400).json({
            success: false,
            message: 'Au moins un DJ doit être confirmé pour terminer la mission'
          });
        }
      }
    }

    // Si la mission est déjà publiée, limiter les modifications
    if (mission.status === 'publiee' && (!result.data.status || result.data.status === 'publiee')) {
      const allowedFields = ['title', 'description', 'budget', 'budget_negociable', 'remuneration_details'];
      const updateData = {};
      for (const field of allowedFields) {
        if (result.data[field] !== undefined) {
          updateData[field] = result.data[field];
        }
      }
      // Si le statut change, l'appliquer
      if (result.data.status) {
        updateData.status = result.data.status;
      }
      await mission.update(updateData);
    } else {
      await mission.update(result.data);
    }

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${req.params.id}`);

    // Notifier si mission publiée
    if (result.data.status === 'publiee' && mission.status !== 'publiee') {
      await notifyDJsOnPublish(mission);
    }

    // Notifier si mission terminée
    if (result.data.status === 'terminee' && mission.status !== 'terminee') {
      await notifyCompletion(mission);
    }

    const updatedMission = await Mission.findByPk(mission.id, {
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

    res.json({
      success: true,
      message: 'Mission mise à jour avec succès',
      data: { mission: updatedMission }
    });
  } catch (error) {
    logger.error('Erreur updateMission:', error);
    next(error);
  }
};

// Supprimer une mission
const deleteMission = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, 'mission.delete')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de supprimer une mission'
      });
    }

    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id, {
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
        }
      ]
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    if (mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à supprimer cette mission'
      });
    }

    // Vérifier si la mission a des candidatures en attente
    if (mission.candidatures && mission.candidatures.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une mission avec des candidatures en attente'
      });
    }

    // Vérifier si la mission a des DJs sélectionnés
    if (mission.dj_selectionnes && mission.dj_selectionnes.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Impossible de supprimer une mission avec des DJs sélectionnés'
      });
    }

    await mission.destroy();

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${req.params.id}`);

    res.json({
      success: true,
      message: 'Mission supprimée avec succès'
    });
  } catch (error) {
    logger.error('Erreur deleteMission:', error);
    next(error);
  }
};

// Publier une mission
const publierMission = async (req, res, next) => {
  try {
    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    if (mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à publier cette mission'
      });
    }

    if (mission.status !== 'brouillon') {
      return res.status(400).json({
        success: false,
        message: 'Seules les missions en brouillon peuvent être publiées'
      });
    }

    if (new Date(mission.date_limite_candidature) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date limite de candidature est déjà passée'
      });
    }

    // Vérifier que la mission est complète
    const requiredFields = ['title', 'description', 'date_mission', 'date_limite_candidature', 'ville', 'lieu'];
    for (const field of requiredFields) {
      if (!mission[field]) {
        return res.status(400).json({
          success: false,
          message: `Le champ "${field}" est requis pour publier la mission`
        });
      }
    }

    await mission.update({ status: 'publiee' });

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${req.params.id}`);

    // Notifier les DJs
    await notifyDJsOnPublish(mission);

    res.json({
      success: true,
      message: 'Mission publiée avec succès',
      data: { mission }
    });
  } catch (error) {
    logger.error('Erreur publierMission:', error);
    next(error);
  }
};

// ====================
// FONCTIONS DJ
// ====================

// Postuler à une mission
const postulerMission = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, 'mission.apply')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de postuler à une mission'
      });
    }

    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = candidatureSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    if (mission.status !== 'publiee') {
      return res.status(400).json({
        success: false,
        message: 'Cette mission n\'est pas ouverte aux candidatures'
      });
    }

    if (new Date(mission.date_limite_candidature) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date limite de candidature est dépassée'
      });
    }

    const existingCandidature = await Candidature.findOne({
      where: {
        mission_id: mission.id,
        dj_id: req.user.id
      }
    });

    if (existingCandidature) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà postulé à cette mission'
      });
    }

    const candidature = await Candidature.create({
      mission_id: mission.id,
      dj_id: req.user.id,
      message_motivation: result.data.message_motivation,
      prix_propose: result.data.prix_propose || mission.budget,
      status: 'en_attente'
    });

    await mission.increment('nb_candidatures');

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');

    const candidatureWithDetails = await Candidature.findByPk(candidature.id, {
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
        },
        {
          model: Mission,
          as: 'mission',
          attributes: ['id', 'title', 'date_mission', 'lieu', 'ville']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Candidature soumise avec succès',
      data: { candidature: candidatureWithDetails }
    });
  } catch (error) {
    logger.error('Erreur postulerMission:', error);
    next(error);
  }
};

// ====================
// GESTION DES SÉLECTIONS DE DJs
// ====================

// Sélectionner des DJs pour une mission
const selectionnerDJs = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, 'mission.manage_applications')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de sélectionner des DJs'
      });
    }

    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = selectionnerDJsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    if (mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à sélectionner des DJs pour cette mission'
      });
    }

    if (mission.status !== 'publiee' && mission.status !== 'en_cours') {
      return res.status(400).json({
        success: false,
        message: 'Cette mission n\'est pas ouverte aux sélections'
      });
    }

    // Vérifier le nombre de DJs sélectionnés
    const selectedDJs = await MissionDJ.findAll({
      where: {
        mission_id: mission.id,
        status: 'selectionne'
      }
    });

    const currentSelectedCount = selectedDJs.length;
    const totalToSelect = result.data.dj_ids.length;

    if (currentSelectedCount + totalToSelect > mission.nb_djs_requis) {
      return res.status(400).json({
        success: false,
        message: `Vous ne pouvez sélectionner que ${mission.nb_djs_requis - currentSelectedCount} DJs supplémentaires`
      });
    }

    // Vérifier que les DJs existent
    const djs = await User.findAll({
      where: {
        id: result.data.dj_ids,
        user_type: 'djorssi',
        is_active: true
      }
    });

    if (djs.length !== result.data.dj_ids.length) {
      return res.status(400).json({
        success: false,
        message: 'Certains DJs n\'existent pas ou ne sont pas des djorssi'
      });
    }

    // Vérifier que les DJs ont postulé
    for (const djId of result.data.dj_ids) {
      const candidature = await Candidature.findOne({
        where: {
          mission_id: mission.id,
          dj_id: djId,
          status: 'en_attente'
        }
      });

      if (!candidature) {
        return res.status(400).json({
          success: false,
          message: `Le DJ avec l'ID ${djId} n'a pas postulé à cette mission`
        });
      }
    }

    // Créer les sélections
    const selections = [];
    for (const djId of result.data.dj_ids) {
      const existingSelection = await MissionDJ.findOne({
        where: {
          mission_id: mission.id,
          dj_id: djId
        }
      });

      if (existingSelection) {
        continue;
      }

      let remuneration = null;
      let notes = null;
      if (result.data.remunerations) {
        const rem = result.data.remunerations.find(r => r.dj_id === djId);
        if (rem) {
          remuneration = rem.remuneration;
          notes = rem.notes;
        }
      }

      const selection = await MissionDJ.create({
        mission_id: mission.id,
        dj_id: djId,
        status: 'selectionne',
        remuneration_specifique: remuneration,
        notes_specifiques: notes
      });

      await Candidature.update(
        { status: 'acceptee' },
        {
          where: {
            mission_id: mission.id,
            dj_id: djId
          }
        }
      );

      // Notification au DJ
      await NotificationService.create(
        djId,
        'selection_dj',
        'Sélectionné pour une mission 🎯',
        `Vous avez été sélectionné pour la mission "${mission.title}"`,
        `/missions/${mission.id}`,
        { mission_id: mission.id }
      );

      selections.push(selection);
    }

    // Mettre à jour le nombre de DJs sélectionnés
    const newSelectedCount = await MissionDJ.count({
      where: {
        mission_id: mission.id,
        status: 'selectionne'
      }
    });

    const djSelectionnesIds = (await MissionDJ.findAll({
      where: {
        mission_id: mission.id,
        status: 'selectionne'
      },
      attributes: ['dj_id']
    })).map(s => s.dj_id);

    await mission.update({
      nb_djs_selectionnes: newSelectedCount,
      dj_selectionnes_ids: djSelectionnesIds
    });

    // Si tous les DJs requis sont sélectionnés
    if (newSelectedCount >= mission.nb_djs_requis) {
      await mission.update({ status: 'en_cours' });
    }

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${req.params.id}`);

    // Récupérer les DJs sélectionnés avec leurs détails
    const djSelectionnes = await MissionDJ.findAll({
      where: {
        mission_id: mission.id,
        status: 'selectionne'
      },
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone', 'email']
        }
      ]
    });

    res.json({
      success: true,
      message: `${selections.length} DJ(s) sélectionné(s) avec succès`,
      data: {
        selections: djSelectionnes,
        mission: {
          id: mission.id,
          title: mission.title,
          nb_djs_requis: mission.nb_djs_requis,
          nb_djs_selectionnes: newSelectedCount,
          status: mission.status
        }
      }
    });
  } catch (error) {
    logger.error('Erreur selectionnerDJs:', error);
    next(error);
  }
};

// Confirmer un DJ sélectionné
const confirmerDJ = async (req, res, next) => {
  try {
    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = confirmerDJSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    if (mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à confirmer des DJs pour cette mission'
      });
    }

    const selection = await MissionDJ.findOne({
      where: {
        mission_id: mission.id,
        dj_id: result.data.dj_id
      }
    });

    if (!selection) {
      return res.status(404).json({
        success: false,
        message: 'Ce DJ n\'est pas sélectionné pour cette mission'
      });
    }

    const newStatus = result.data.confirmation ? 'confirme' : 'annule';
    await selection.update({
      status: newStatus,
      date_confirmation: new Date(),
      notes_specifiques: result.data.notes || selection.notes_specifiques
    });

    // Invalider le cache
    await CacheService.delPattern('cache:*/api/missions*');
    await CacheService.del(`cache:mission:${req.params.id}`);

    // Notification au DJ
    if (result.data.confirmation) {
      await NotificationService.create(
        result.data.dj_id,
        'confirmation_dj',
        'Confirmation de mission ✅',
        `Votre participation à la mission "${mission.title}" a été confirmée`,
        `/missions/${mission.id}`,
        { mission_id: mission.id }
      );
    }

    res.json({
      success: true,
      message: `DJ ${result.data.confirmation ? 'confirmé' : 'annulé'} avec succès`,
      data: { selection }
    });
  } catch (error) {
    logger.error('Erreur confirmerDJ:', error);
    next(error);
  }
};

// Obtenir les DJs sélectionnés pour une mission
const getDJsSelectionnes = async (req, res, next) => {
  try {
    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const mission = await Mission.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'dj_selectionnes',
          through: {
            attributes: ['status', 'remuneration_specifique', 'notes_specifiques', 'date_confirmation', 'createdAt']
          },
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone', 'email']
        }
      ]
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    // Vérifier les droits d'accès
    const userRole = req.user.user_type;
    if (userRole === 'djorssi') {
      const isSelected = mission.dj_selectionnes.some(dj => dj.id === req.user.id);
      if (!isSelected) {
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à voir cette information'
        });
      }
    }

    if (userRole === 'employeur' && mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à voir cette information'
      });
    }

    res.json({
      success: true,
      data: {
        mission: {
          id: mission.id,
          title: mission.title,
          nb_djs_requis: mission.nb_djs_requis,
          nb_djs_selectionnes: mission.nb_djs_selectionnes,
          status: mission.status
        },
        dj_selectionnes: mission.dj_selectionnes
      }
    });
  } catch (error) {
    logger.error('Erreur getDJsSelectionnes:', error);
    next(error);
  }
};

// ====================
// FONCTIONS ADMIN
// ====================

// Admin - Obtenir toutes les missions
const adminGetAllMissions = async (req, res, next) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès admin requis'
      });
    }

    const result = missionQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      ville,
      mission_type,
      status,
      sort_by = 'createdAt',
      sort_order = 'DESC'
    } = result.data;

    const where = {};
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    if (ville) where.ville = ville;
    if (mission_type) where.mission_type = mission_type;
    if (status) where.status = status;

    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_order]];

    const { count, rows } = await Mission.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'employer',
          attributes: ['id', 'username', 'first_name', 'last_name', 'company_name', 'email', 'phone', 'profile_photo']
        },
        {
          model: CategoryMission,
          as: 'category',
          attributes: ['id', 'name', 'icon', 'color']
        },
        {
          model: Candidature,
          as: 'candidatures',
          attributes: ['id', 'status', 'createdAt']
        },
        {
          model: User,
          as: 'dj_selectionnes',
          through: {
            attributes: ['status', 'remuneration_specifique']
          },
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
        }
      ],
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        missions: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Erreur adminGetAllMissions:', error);
    next(error);
  }
};

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
        `Une nouvelle mission "${mission.title}" vient d'être publiée`,
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
  // Publiques
  getAllMissions,
  getMissionById,
  
  // Employeur
  createMission,
  updateMission,
  deleteMission,
  publierMission,
  
  // DJ
  postulerMission,
  
  // Sélections
  selectionnerDJs,
  confirmerDJ,
  getDJsSelectionnes,
  
  // Admin
  adminGetAllMissions
};