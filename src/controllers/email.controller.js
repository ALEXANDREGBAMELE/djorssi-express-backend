// src/controllers/email.controller.js
const emailService = require('../../config/email');
const logger = require('../../config/logger');
const { requireRole } = require('../../config/permissions');

// Envoyer un email (admin)
const sendEmail = async (req, res, next) => {
  try {
    const { to, subject, template, data, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({
        success: false,
        message: 'Les champs "to" et "subject" sont requis',
      });
    }

    const result = await emailService.sendEmail({
      to,
      subject,
      template,
      data,
      html,
      text,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Erreur sendEmail:', error);
    next(error);
  }
};

// Envoyer un email en masse (admin)
const sendBulkEmail = async (req, res, next) => {
  try {
    const { recipients, subject, template, data } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La liste des destinataires est requise',
      });
    }

    const results = await emailService.sendBulkEmails(
      recipients,
      subject,
      template,
      data
    );

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Erreur sendBulkEmail:', error);
    next(error);
  }
};

// Vérifier la connexion email (admin)
const verifyEmailConnection = async (req, res, next) => {
  try {
    const status = await emailService.verifyConnection();
    res.json({
      success: status,
      message: status ? 'Connexion email établie' : 'Erreur de connexion email',
    });
  } catch (error) {
    logger.error('Erreur verifyEmailConnection:', error);
    next(error);
  }
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  verifyEmailConnection,
};