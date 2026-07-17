// src/controllers/identity.controller.js
const IdentityVerificationService = require('../services/identity-verification.service');
const { submitDocumentsSchema, approveVerificationSchema, rejectVerificationSchema, verificationQuerySchema } = require('../validators/identity.validator');
const logger = require('../../config/logger');

// Soumettre des documents
const submitDocuments = async (req, res, next) => {
  try {
    const result = submitDocumentsSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const documents = await IdentityVerificationService.submitDocuments(
      req.user.id,
      result.data.documents
    );

    res.status(201).json({
      success: true,
      message: 'Documents soumis avec succès',
      data: { documents }
    });
  } catch (error) {
    logger.error('Erreur submitDocuments:', error);
    next(error);
  }
};

// Obtenir mes documents
const getMyDocuments = async (req, res, next) => {
  try {
    const documents = await IdentityVerificationService.getUserDocuments(req.user.id);
    res.json({
      success: true,
      data: { documents }
    });
  } catch (error) {
    logger.error('Erreur getMyDocuments:', error);
    next(error);
  }
};

// Obtenir mon statut de vérification
const getMyVerificationStatus = async (req, res, next) => {
  try {
    const status = await IdentityVerificationService.getVerificationStatus(req.user.id);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Erreur getMyVerificationStatus:', error);
    next(error);
  }
};

// ====================
// ROUTES ADMIN
// ====================

// Obtenir les demandes en attente
const getPendingVerifications = async (req, res, next) => {
  try {
    const result = verificationQuerySchema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const { page = 1, limit = 20 } = result.data;
    const data = await IdentityVerificationService.getPendingVerifications(page, limit);
    res.json({
      success: true,
      data
    });
  } catch (error) {
    logger.error('Erreur getPendingVerifications:', error);
    next(error);
  }
};

// Approuver une vérification
const approveVerification = async (req, res, next) => {
  try {
    const result = approveVerificationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const document = await IdentityVerificationService.approveVerification(
      result.data.document_id,
      req.user.id
    );

    res.json({
      success: true,
      message: 'Vérification approuvée avec succès',
      data: { document }
    });
  } catch (error) {
    logger.error('Erreur approveVerification:', error);
    next(error);
  }
};

// Rejeter une vérification
const rejectVerification = async (req, res, next) => {
  try {
    const result = rejectVerificationSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        errors: result.error.flatten().fieldErrors
      });
    }

    const document = await IdentityVerificationService.rejectVerification(
      result.data.document_id,
      req.user.id,
      result.data.reason
    );

    res.json({
      success: true,
      message: 'Vérification rejetée',
      data: { document }
    });
  } catch (error) {
    logger.error('Erreur rejectVerification:', error);
    next(error);
  }
};

// Obtenir la vérification d'un utilisateur (Admin)
const getUserVerification = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const status = await IdentityVerificationService.getVerificationStatus(userId);
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Erreur getUserVerification:', error);
    next(error);
  }
};

module.exports = {
  submitDocuments,
  getMyDocuments,
  getMyVerificationStatus,
  getPendingVerifications,
  approveVerification,
  rejectVerification,
  getUserVerification
};