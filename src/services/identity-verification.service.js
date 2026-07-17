// src/services/identity-verification.service.js
const { User, IdentityDocument, Notification } = require('../models');
const { Op } = require('sequelize');
const logger = require('../../config/logger');
const NotificationService = require('./notification.service');

class IdentityVerificationService {
  
  // Soumettre des documents
  static async submitDocuments(userId, documents) {
    try {
      // Vérifier si l'utilisateur a déjà des documents en attente
      const existingPending = await IdentityDocument.findOne({
        where: {
          user_id: userId,
          status: 'pending'
        }
      });

      if (existingPending) {
        throw new Error('Vous avez déjà des documents en attente de vérification');
      }

      // Créer les documents
      const createdDocuments = [];
      for (const doc of documents) {
        const document = await IdentityDocument.create({
          user_id: userId,
          document_type: doc.document_type,
          document_number: doc.document_number,
          document_front_url: doc.document_front_url,
          document_back_url: doc.document_back_url || null,
          selfie_url: doc.selfie_url || null,
          expiry_date: doc.expiry_date || null,
          status: 'pending'
        });
        createdDocuments.push(document);
      }

      // Mettre à jour le statut de l'utilisateur
      await User.update({
        identity_verification_status: 'pending'
      }, {
        where: { id: userId }
      });

      // Notifier l'admin
      await NotificationService.create(
        null, // Admin system
        'system',
        'Nouvelle demande de vérification',
        `L'utilisateur ${userId} a soumis des documents pour vérification`,
        '/admin/verifications',
        { user_id: userId, document_count: createdDocuments.length }
      );

      return createdDocuments;
    } catch (error) {
      logger.error('Erreur submitDocuments:', error);
      throw error;
    }
  }

  // Récupérer les documents d'un utilisateur
  static async getUserDocuments(userId) {
    try {
      const documents = await IdentityDocument.findAll({
        where: { user_id: userId, is_active: true },
        order: [['createdAt', 'DESC']]
      });
      return documents;
    } catch (error) {
      logger.error('Erreur getUserDocuments:', error);
      throw error;
    }
  }

  // Récupérer les demandes en attente (Admin)
  static async getPendingVerifications(page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;
      const { count, rows } = await IdentityDocument.findAndCountAll({
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'first_name', 'last_name', 'email', 'phone']
          }
        ],
        order: [['createdAt', 'ASC']],
        limit,
        offset
      });

      return {
        documents: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      logger.error('Erreur getPendingVerifications:', error);
      throw error;
    }
  }

  // Approuver la vérification (Admin)
  static async approveVerification(documentId, adminId) {
    try {
      const document = await IdentityDocument.findByPk(documentId);
      if (!document) {
        throw new Error('Document non trouvé');
      }

      // Mettre à jour le document
      await document.update({
        status: 'approved',
        reviewed_by: adminId,
        reviewed_at: new Date()
      });

      // Mettre à jour l'utilisateur
      await User.update({
        identity_verified: true,
        identity_verified_at: new Date(),
        identity_verified_by: adminId,
        identity_verification_status: 'approved'
      }, {
        where: { id: document.user_id }
      });

      // Notifier l'utilisateur
      await NotificationService.create(
        document.user_id,
        'identity_verified',
        'Vérification d\'identité approuvée',
        'Votre identité a été vérifiée avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités.',
        '/profile/verification',
        { document_id: document.id }
      );

      return document;
    } catch (error) {
      logger.error('Erreur approveVerification:', error);
      throw error;
    }
  }

  // Rejeter la vérification (Admin)
  static async rejectVerification(documentId, adminId, reason) {
    try {
      const document = await IdentityDocument.findByPk(documentId);
      if (!document) {
        throw new Error('Document non trouvé');
      }

      // Mettre à jour le document
      await document.update({
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: adminId,
        reviewed_at: new Date()
      });

      // Mettre à jour l'utilisateur
      await User.update({
        identity_verification_status: 'rejected',
        identity_verification_rejection_reason: reason
      }, {
        where: { id: document.user_id }
      });

      // Notifier l'utilisateur
      await NotificationService.create(
        document.user_id,
        'identity_rejected',
        'Vérification d\'identité rejetée',
        `Votre demande de vérification a été rejetée. Raison: ${reason}`,
        '/profile/verification',
        { document_id: document.id, reason }
      );

      return document;
    } catch (error) {
      logger.error('Erreur rejectVerification:', error);
      throw error;
    }
  }

  // Obtenir le statut de vérification d'un utilisateur
  static async getVerificationStatus(userId) {
    try {
      const user = await User.findByPk(userId, {
        attributes: [
          'id',
          'identity_verified',
          'identity_verified_at',
          'identity_verification_status',
          'identity_verification_rejection_reason'
        ]
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      const documents = await IdentityDocument.findAll({
        where: { user_id: userId, is_active: true },
        attributes: ['id', 'document_type', 'status', 'createdAt', 'reviewed_at']
      });

      return {
        user: user.toJSON(),
        documents
      };
    } catch (error) {
      logger.error('Erreur getVerificationStatus:', error);
      throw error;
    }
  }
}

module.exports = IdentityVerificationService;