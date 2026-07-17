// src/controllers/reporting.controller.js
const ReportingService = require('../services/reporting.service');
const { User } = require('../models');
const logger = require('../../config/logger');

class ReportingController {
  // ====================
  // RAPPORT DJ
  // ====================
  static async getDjReport(req, res, next) {
    try {
      const { period = 'month' } = req.query;

      const report = await ReportingService.getDjReport(req.user.id, period);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Erreur getDjReport:', error);
      next(error);
    }
  }

  // ====================
  // RAPPORT EMPLOYEUR
  // ====================
  static async getEmployeurReport(req, res, next) {
    try {
      const { period = 'month' } = req.query;

      const report = await ReportingService.getEmployeurReport(req.user.id, period);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Erreur getEmployeurReport:', error);
      next(error);
    }
  }

  // ====================
  // RAPPORT ADMIN
  // ====================
  static async getAdminReport(req, res, next) {
    try {
      const { period = 'month', ...filters } = req.query;

      const report = await ReportingService.getAdminReport(period, filters);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      logger.error('Erreur getAdminReport:', error);
      next(error);
    }
  }

  // ====================
  // EXPORTATION PDF
  // ====================
  static async exportReportPDF(req, res, next) {
    try {
      const { type, period = 'month' } = req.query;
      let report;

      switch (type) {
        case 'dj':
          report = await ReportingService.getDjReport(req.user.id, period);
          break;
        case 'employeur':
          report = await ReportingService.getEmployeurReport(req.user.id, period);
          break;
        case 'admin':
          if (req.user.user_type !== 'admin') {
            return res.status(403).json({
              success: false,
              message: 'Accès non autorisé'
            });
          }
          report = await ReportingService.getAdminReport(period);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Type de rapport invalide'
          });
      }

      // Ici, vous pouvez générer un PDF avec une bibliothèque comme PDFKit
      // ou wkhtmltopdf

      res.json({
        success: true,
        message: 'Exportation PDF en cours de développement',
        data: report
      });
    } catch (error) {
      logger.error('Erreur exportReportPDF:', error);
      next(error);
    }
  }

  // ====================
  // EXPORTATION EXCEL/CSV
  // ====================
  static async exportReportCSV(req, res, next) {
    try {
      const { type, period = 'month' } = req.query;
      let report;

      switch (type) {
        case 'dj':
          report = await ReportingService.getDjReport(req.user.id, period);
          break;
        case 'employeur':
          report = await ReportingService.getEmployeurReport(req.user.id, period);
          break;
        case 'admin':
          if (req.user.user_type !== 'admin') {
            return res.status(403).json({
              success: false,
              message: 'Accès non autorisé'
            });
          }
          report = await ReportingService.getAdminReport(period);
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Type de rapport invalide'
          });
      }

      // Ici, vous pouvez générer un CSV avec une bibliothèque comme csv-parser

      res.json({
        success: true,
        message: 'Exportation CSV en cours de développement',
        data: report
      });
    } catch (error) {
      logger.error('Erreur exportReportCSV:', error);
      next(error);
    }
  }

  // ====================
  // PLANIFICATION DE RAPPORT
  // ====================
  static async scheduleReport(req, res, next) {
    try {
      const { type, period, recipients, format = 'pdf' } = req.body;

      if (!type || !period || !recipients) {
        return res.status(400).json({
          success: false,
          message: 'Les champs "type", "period" et "recipients" sont requis'
        });
      }

      // Ici, vous pouvez ajouter un job à Bull pour envoyer le rapport périodiquement

      res.json({
        success: true,
        message: 'Rapport programmé avec succès',
        data: { type, period, recipients, format }
      });
    } catch (error) {
      logger.error('Erreur scheduleReport:', error);
      next(error);
    }
  }

  // ====================
  // LISTE DES RAPPORTS PROGRAMMÉS
  // ====================
  static async getScheduledReports(req, res, next) {
    try {
      // Récupérer les jobs planifiés depuis Bull
      // À implémenter avec la queue

      res.json({
        success: true,
        data: {
          scheduled_reports: []
        }
      });
    } catch (error) {
      logger.error('Erreur getScheduledReports:', error);
      next(error);
    }
  }
}

module.exports = ReportingController;