// src/controllers/candidature.controller.js
const { Candidature, Mission, User } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const { hasPermission } = require('../../config/permissions');
const {
  postulerSchema,
  traiterCandidatureSchema,
  evaluerCandidatureSchema,
  paiementSchema,
  candidatureQuerySchema,
  idParamSchema
} = require('../validators/candidature.validator');

// ====================
// FONCTIONS DJ
// ====================

// Postuler à une mission
const postuler = async (req, res, next) => {
  try {
    // Vérifier la permission
    if (!hasPermission(req.user, 'mission.apply')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de postuler'
      });
    }

    const result = postulerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { missionId } = req.params;
    const djId = req.user.id;

    // Vérifier que la mission existe
    const mission = await Mission.findByPk(missionId);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    // Vérifier que la mission est publiée
    if (mission.status !== 'publiee') {
      return res.status(400).json({
        success: false,
        message: 'Cette mission n\'est pas ouverte aux candidatures'
      });
    }

    // Vérifier que la date limite n'est pas passée
    if (new Date(mission.date_limite_candidature) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'La date limite de candidature est dépassée'
      });
    }

    // Vérifier que le DJ n'a pas déjà postulé
    const existingCandidature = await Candidature.findOne({
      where: {
        mission_id: missionId,
        dj_id: djId
      }
    });

    if (existingCandidature) {
      return res.status(400).json({
        success: false,
        message: 'Vous avez déjà postulé à cette mission'
      });
    }

    // Créer la candidature
    const candidature = await Candidature.create({
      mission_id: missionId,
      dj_id: djId,
      message_motivation: result.data.message_motivation,
      prix_propose: result.data.prix_propose || mission.budget,
      status: 'en_attente'
    });

    // Incrémenter le nombre de candidatures
    await mission.increment('nb_candidatures');

    // Récupérer la candidature avec les détails
    const candidatureWithDetails = await Candidature.findByPk(candidature.id, {
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone', 'email']
        },
        {
          model: Mission,
          as: 'mission',
          attributes: ['id', 'title', 'date_mission', 'lieu', 'ville', 'employer_id']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Candidature soumise avec succès',
      data: { candidature: candidatureWithDetails }
    });
  } catch (error) {
    logger.error('Erreur postuler:', error);
    next(error);
  }
};

// Annuler sa candidature (DJ)
const annulerCandidature = async (req, res, next) => {
  try {
    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const candidature = await Candidature.findByPk(req.params.id);
    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que le DJ est le propriétaire
    if (candidature.dj_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à annuler cette candidature'
      });
    }

    // Vérifier que la candidature est en attente
    if (candidature.status !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Cette candidature ne peut plus être annulée'
      });
    }

    await candidature.update({ status: 'annulee' });

    // Décrémenter le nombre de candidatures
    await Mission.decrement('nb_candidatures', {
      where: { id: candidature.mission_id }
    });

    res.json({
      success: true,
      message: 'Candidature annulée avec succès',
      data: { candidature }
    });
  } catch (error) {
    logger.error('Erreur annulerCandidature:', error);
    next(error);
  }
};

// ====================
// FONCTIONS EMPLOYEUR
// ====================

// Voir les candidatures pour une mission
const getCandidaturesByMission = async (req, res, next) => {
  try {
    const { missionId } = req.params;
    const result = candidatureQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    // Vérifier que la mission existe
    const mission = await Mission.findByPk(missionId);
    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Mission non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire ou admin
    if (mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à voir ces candidatures'
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      date_debut,
      date_fin,
      paiement_status,
      sort_by = 'createdAt',
      sort_order = 'DESC'
    } = result.data;

    const where = { mission_id: missionId };
    if (status) where.status = status;
    if (paiement_status) where.paiement_status = paiement_status;
    if (date_debut || date_fin) {
      where.createdAt = {};
      if (date_debut) where.createdAt[Op.gte] = new Date(date_debut);
      if (date_fin) where.createdAt[Op.lte] = new Date(date_fin);
    }

    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_order]];

    const { count, rows } = await Candidature.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone', 'email', 'bio']
        }
      ],
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        candidatures: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Erreur getCandidaturesByMission:', error);
    next(error);
  }
};

// ====================
// PRÉ-SÉLECTION
// ====================

// Pré-sélectionner un candidat
const preSelectionner = async (req, res, next) => {
  try {
    const result = preSelectionnerSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { message, conversation_id } = result.data;
    const { missionId, id: candidatureId } = req.params;

    // Récupérer la candidature
    const candidature = await Candidature.findByPk(candidatureId, {
      include: [
        { model: User, as: 'dj' },
        { model: Mission, as: 'mission' }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }
 // Vérifier que l'utilisateur est le propriétaire de la mission
    if (candidature.mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier que la candidature est en attente
    if (candidature.status !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Cette candidature ne peut pas être pré-sélectionnée'
      });
    }

    // Créer ou récupérer la conversation
    let conversationId = conversation_id;
    if (!conversationId) {
      const conversation = await MessageService.createConversation(
        req.user.id,
        candidature.dj_id,
        missionId,
        message
      );
      conversationId = conversation.id;
    }
    // Mettre à jour la candidature
    await candidature.update({
      preselected: true,
      preselected_at: new Date(),
      preselected_by: req.user.id,
    });

    // Envoyer une notification au DJ
    await NotificationService.create(
      candidature.dj_id,
      'pre_selection',
      'Pré-sélectionné pour une mission 🎯',
      `Vous avez été pré-sélectionné pour la mission "${candidature.mission.title}". L'employeur vous contactera bientôt.`,
      `/conversations/${conversationId}`,
      { candidature_id: candidatureId, mission_id: missionId }
    );

    res.json({
      success: true,
      message: 'Candidat pré-sélectionné avec succès',
      data: {
        candidature,
        conversation_id: conversationId
      }
    });
  } catch (error) {
    logger.error('Erreur preSelectionner:', error);
    next(error);
  }
};
// ====================
// ENTRETIEN
// ====================

// Planifier un entretien
const planifierEntretien = async (req, res, next) => {
  try {
    const result = planifierEntretienSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { date, lieu, type, message } = result.data;
    const { missionId, id: candidatureId } = req.params;

    const candidature = await Candidature.findByPk(candidatureId, {
      include: [
        { model: User, as: 'dj' },
        { model: Mission, as: 'mission' }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (candidature.mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    // Vérifier que la candidature est pré-sélectionnée
    if (!candidature.preselected) {
      return res.status(400).json({
        success: false,
        message: 'Le candidat doit d\'abord être pré-sélectionné'
      });
    }

    // Créer une conversation si elle n'existe pas
    let conversationId = candidature.entretien_conversation_id;
    if (!conversationId) {
      const conversation = await MessageService.createConversation(
        req.user.id,
        candidature.dj_id,
        missionId,
        message
      );
      conversationId = conversation.id;
    } else {
      // Envoyer un message dans la conversation existante
      await MessageService.sendMessage(
        conversationId,
        req.user.id,
        `📅 Entretien planifié :\nDate : ${new Date(date).toLocaleString()}\nLieu : ${lieu || 'À confirmer'}\nType : ${type}\n\n${message}`
      );
    }

    // Mettre à jour la candidature
    await candidature.update({
      entretien_programme: true,
      entretien_date: date,
      entretien_lieu: lieu || null,
      entretien_type: type,
      entretien_conversation_id: conversationId,
      entretien_status: 'planifie',
    });

    // Notification au DJ
    await NotificationService.create(
      candidature.dj_id,
      'entretien_planifie',
      'Entretien planifié 📅',
      `Un entretien pour la mission "${candidature.mission.title}" a été planifié le ${new Date(date).toLocaleString()}.`,
      `/conversations/${conversationId}`,
      {
        candidature_id: candidatureId,
        mission_id: missionId,
        date: date,
        type: type,
        lieu: lieu
      }
    );

    res.json({
      success: true,
      message: 'Entretien planifié avec succès',
      data: {
        candidature,
        conversation_id: conversationId
      }
    });
  } catch (error) {
    logger.error('Erreur planifierEntretien:', error);
    next(error);
  }
};

// Confirmer l'entretien (DJ)
const confirmerEntretien = async (req, res, next) => {
  try {
    const result = confirmerEntretienSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { confirmation, notes } = result.data;
    const { id: candidatureId, entretienId } = req.params;

    const candidature = await Candidature.findByPk(candidatureId, {
      include: [
        { model: User, as: 'dj' },
        { model: Mission, as: 'mission' }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que le DJ est le propriétaire
    if (candidature.dj_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    const newStatus = confirmation ? 'confirme' : 'annule';
    await candidature.update({
      entretien_status: newStatus,
      entretien_notes: notes || candidature.entretien_notes,
    });

    // Si confirmé, envoyer un message à l'employeur
    if (confirmation) {
      await MessageService.sendMessage(
        candidature.entretien_conversation_id,
        req.user.id,
        `✅ J'ai bien reçu la convocation pour l'entretien. Je confirme ma participation. ${notes ? `\n\nNotes : ${notes}` : ''}`
      );

      await NotificationService.create(
        candidature.mission.employer_id,
        'entretien_confirme',
        'Entretien confirmé ✅',
        `Le DJ ${candidature.dj.first_name} ${candidature.dj.last_name} a confirmé sa participation à l'entretien.`,
        `/conversations/${candidature.entretien_conversation_id}`,
        { candidature_id: candidatureId }
      );
    }

    res.json({
      success: true,
      message: confirmation ? 'Entretien confirmé' : 'Entretien annulé',
      data: { candidature }
    });
  } catch (error) {
    logger.error('Erreur confirmerEntretien:', error);
    next(error);
  }
};

// Terminer l'entretien (passer au statut "acceptee" ou "refusee")
const terminerEntretien = async (req, res, next) => {
  try {
    const { id: candidatureId } = req.params;
    const { status, notes } = req.body;

    if (!['acceptee', 'refusee'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Le statut doit être "acceptee" ou "refusee"'
      });
    }

    const candidature = await Candidature.findByPk(candidatureId, {
      include: [
        { model: User, as: 'dj' },
        { model: Mission, as: 'mission' }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire
    if (candidature.mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Non autorisé'
      });
    }

    await candidature.update({
      status: status,
      entretien_status: 'termine',
      entretien_notes: notes || candidature.entretien_notes,
      date_reponse: new Date(),
      ...(status === 'acceptee' && { confirmed_at: new Date() })
    });

    // Notification au DJ
    await NotificationService.create(
      candidature.dj_id,
      status === 'acceptee' ? 'candidature_acceptee' : 'candidature_refusee',
      status === 'acceptee' ? 'Félicitations ! 🎉' : 'Merci pour votre candidature',
      status === 'acceptee'
        ? `Vous avez été retenu pour la mission "${candidature.mission.title}"`
        : `Votre candidature pour la mission "${candidature.mission.title}" n'a pas été retenue`,
      `/missions/${candidature.mission_id}`,
      { candidature_id: candidatureId }
    );

    // Message dans la conversation
    if (candidature.entretien_conversation_id) {
      await MessageService.sendMessage(
        candidature.entretien_conversation_id,
        req.user.id,
        status === 'acceptee'
          ? `🎉 Félicitations ! Nous avons le plaisir de vous annoncer que vous êtes retenu pour cette mission. Nous vous contacterons prochainement pour les détails.`
          : `Merci d'avoir participé à cette candidature. Malheureusement, nous ne donnons pas suite à votre profil pour cette mission. Nous vous souhaitons bonne chance dans vos recherches.`
      );
    }

    res.json({
      success: true,
      message: `Candidature ${status === 'acceptee' ? 'acceptée' : 'refusée'}`,
      data: { candidature }
    });
  } catch (error) {
    logger.error('Erreur terminerEntretien:', error);
    next(error);
  }
};


// Traiter une candidature (accepter/refuser)
const traiterCandidature = async (req, res, next) => {
  try {
    // Vérifier la permission
    if (!hasPermission(req.user, 'mission.manage_applications')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de traiter les candidatures'
      });
    }

    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = traiterCandidatureSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const candidature = await Candidature.findByPk(req.params.id, {
      include: [
        {
          model: Mission,
          as: 'mission'
        }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la mission ou admin
    if (candidature.mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à traiter cette candidature'
      });
    }

    // Vérifier que la candidature est en attente
    if (candidature.status !== 'en_attente') {
      return res.status(400).json({
        success: false,
        message: 'Cette candidature a déjà été traitée'
      });
    }

    // Mettre à jour la candidature
    await candidature.update({
      status: result.data.status,
      commentaire_employeur: result.data.commentaire,
      date_reponse: new Date(),
      ...(result.data.remuneration && { prix_propose: result.data.remuneration })
    });

    // Si la candidature est acceptée et que le statut de la mission est 'publiee'
    // On peut soit la passer en 'en_cours', soit attendre la sélection
    if (result.data.status === 'acceptee') {
      // Incrémenter le nombre de DJs sélectionnés
      // (à gérer via la sélection, pas ici)
    }

    const updatedCandidature = await Candidature.findByPk(candidature.id, {
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo']
        },
        {
          model: Mission,
          as: 'mission',
          attributes: ['id', 'title']
        }
      ]
    });

    res.json({
      success: true,
      message: `Candidature ${result.data.status === 'acceptee' ? 'acceptée' : 'refusée'} avec succès`,
      data: { candidature: updatedCandidature }
    });
  } catch (error) {
    logger.error('Erreur traiterCandidature:', error);
    next(error);
  }
};

// ====================
// FONCTIONS D'ÉVALUATION (après mission)
// ====================

// Évaluer un DJ (employeur)
const evaluerDJ = async (req, res, next) => {
  try {
    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = evaluerCandidatureSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const candidature = await Candidature.findByPk(req.params.id, {
      include: [
        {
          model: Mission,
          as: 'mission'
        }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire de la mission ou admin
    if (candidature.mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à évaluer ce DJ'
      });
    }

    // Vérifier que la mission est terminée
    if (candidature.mission.status !== 'terminee') {
      return res.status(400).json({
        success: false,
        message: 'La mission doit être terminée pour évaluer le DJ'
      });
    }

    // Vérifier que la candidature est acceptée
    if (candidature.status !== 'acceptee') {
      return res.status(400).json({
        success: false,
        message: 'Seul un DJ accepté peut être évalué'
      });
    }

    // Calculer la note moyenne
    const evaluation = {
      ponctualite: result.data.ponctualite,
      professionnalisme: result.data.professionnalisme,
      qualite_prestation: result.data.qualite_prestation,
      communication: result.data.communication,
      commentaire: result.data.commentaire
    };

    const notes = [
      result.data.ponctualite,
      result.data.professionnalisme,
      result.data.qualite_prestation,
      result.data.communication
    ].filter(n => n !== null && n !== undefined);

    const moyenne = notes.length > 0 
      ? notes.reduce((a, b) => a + b, 0) / notes.length 
      : result.data.note_globale || null;

    await candidature.update({
      evaluation: evaluation,
      note_employeur: moyenne || result.data.note_globale || null,
      commentaire_dj: result.data.commentaire || candidature.commentaire_dj
    });

    // Mettre à jour la note moyenne de la mission
    const allEvaluations = await Candidature.findAll({
      where: {
        mission_id: candidature.mission_id,
        note_employeur: { [Op.ne]: null }
      },
      attributes: ['note_employeur']
    });

    if (allEvaluations.length > 0) {
      const avgNote = allEvaluations.reduce((a, b) => a + parseFloat(b.note_employeur), 0) / allEvaluations.length;
      await Mission.update(
        { note_moyenne: avgNote },
        { where: { id: candidature.mission_id } }
      );
    }

    res.json({
      success: true,
      message: 'Évaluation effectuée avec succès',
      data: { candidature }
    });
  } catch (error) {
    logger.error('Erreur evaluerDJ:', error);
    next(error);
  }
};

// ====================
// FONCTIONS DE PAIEMENT
// ====================

// Enregistrer un paiement
const enregistrerPaiement = async (req, res, next) => {
  try {
    // Vérifier la permission
    if (!hasPermission(req.user, 'mission.manage_applications')) {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'avez pas la permission de gérer les paiements'
      });
    }

    const idResult = idParamSchema.safeParse(req.params);
    if (!idResult.success) {
      return res.status(400).json({
        success: false,
        errors: idResult.error.flatten().fieldErrors
      });
    }

    const result = paiementSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const candidature = await Candidature.findByPk(req.params.id, {
      include: [
        {
          model: Mission,
          as: 'mission'
        }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    // Vérifier que l'utilisateur est le propriétaire ou admin
    if (candidature.mission.employer_id !== req.user.id && req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Vous n\'êtes pas autorisé à gérer les paiements pour cette candidature'
      });
    }

    // Vérifier que la candidature est acceptée
    if (candidature.status !== 'acceptee') {
      return res.status(400).json({
        success: false,
        message: 'Seul un DJ accepté peut être payé'
      });
    }

    await candidature.update({
      paiement_status: 'paye',
      montant_paye: result.data.montant,
      date_paiement: new Date(),
      commentaire_employeur: `${candidature.commentaire_employeur || ''}\nPaiement: ${result.data.mode_paiement} - Réf: ${result.data.reference || 'N/A'}`
    });

    res.json({
      success: true,
      message: 'Paiement enregistré avec succès',
      data: { candidature }
    });
  } catch (error) {
    logger.error('Erreur enregistrerPaiement:', error);
    next(error);
  }
};

// ====================
// FONCTIONS ADMIN
// ====================

// Obtenir toutes les candidatures (admin)
const adminGetAllCandidatures = async (req, res, next) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès admin requis'
      });
    }

    const result = candidatureQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const {
      page = 1,
      limit = 20,
      status,
      mission_id,
      dj_id,
      paiement_status,
      sort_by = 'createdAt',
      sort_order = 'DESC'
    } = result.data;

    const where = {};
    if (status) where.status = status;
    if (mission_id) where.mission_id = mission_id;
    if (dj_id) where.dj_id = dj_id;
    if (paiement_status) where.paiement_status = paiement_status;

    const offset = (page - 1) * limit;
    const order = [[sort_by, sort_order]];

    const { count, rows } = await Candidature.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'email']
        },
        {
          model: Mission,
          as: 'mission',
          attributes: ['id', 'title', 'date_mission', 'lieu', 'ville']
        }
      ],
      order,
      limit: parseInt(limit),
      offset
    });

    res.json({
      success: true,
      data: {
        candidatures: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('Erreur adminGetAllCandidatures:', error);
    next(error);
  }
};

// Obtenir une candidature par ID (admin)
const adminGetCandidatureById = async (req, res, next) => {
  try {
    if (req.user.user_type !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Accès admin requis'
      });
    }

    const result = idParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const candidature = await Candidature.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'dj',
          attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'phone', 'email']
        },
        {
          model: Mission,
          as: 'mission',
          include: [
            {
              model: User,
              as: 'employer',
              attributes: ['id', 'username', 'first_name', 'last_name', 'email']
            }
          ]
        }
      ]
    });

    if (!candidature) {
      return res.status(404).json({
        success: false,
        message: 'Candidature non trouvée'
      });
    }

    res.json({
      success: true,
      data: { candidature }
    });
  } catch (error) {
    logger.error('Erreur adminGetCandidatureById:', error);
    next(error);
  }
};

module.exports = {
  // DJ
  postuler,
  annulerCandidature,
  
  // Employeur
  getCandidaturesByMission,
  traiterCandidature,
  evaluerDJ,
  enregistrerPaiement,
  preSelectionner,
  planifierEntretien,
  confirmerEntretien,
  terminerEntretien,
  
  // Admin
  adminGetAllCandidatures,
  adminGetCandidatureById

};