// src/controllers/sms.controller.js
const smsService = require('../../config/sms');
const logger = require('../../config/logger');

// Envoyer un SMS (admin)
const sendSMS = async (req, res, next) => {
  try {
    const { to, message, template, data } = req.body;

    if (!to || (!message && !template)) {
      return res.status(400).json({
        success: false,
        message: 'Les champs "to" et "message" ou "template" sont requis',
      });
    }

    const result = await smsService.sendSMS({
      to,
      message,
      template,
      data,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Erreur sendSMS:', error);
    next(error);
  }
};

// Envoyer en masse (admin)
const sendBulkSMS = async (req, res, next) => {
  try {
    const { recipients, message } = req.body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La liste des destinataires est requise',
      });
    }

    const results = await smsService.sendBulkSMS(recipients, message);

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    logger.error('Erreur sendBulkSMS:', error);
    next(error);
  }
};

// Vérifier le solde (admin)
const checkBalance = async (req, res, next) => {
  try {
    const result = await smsService.checkBalance();
    res.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    logger.error('Erreur checkBalance:', error);
    next(error);
  }
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  checkBalance,
};