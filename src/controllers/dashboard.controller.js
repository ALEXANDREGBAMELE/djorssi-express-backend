// src/controllers/dashboard.controller.js
const DashboardService = require('../services/dashboard.service');
const { User } = require('../models');
const logger = require('../../config/logger');

class DashboardController {
  // ====================
  // DASHBOARD DJ
  // ====================
  static async getDjDashboard(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'user_type']
      });

      const dashboard = await DashboardService.getDjDashboard(req.user.id);

      res.json({
        success: true,
        data: {
          user,
          ...dashboard
        }
      });
    } catch (error) {
      logger.error('Erreur getDjDashboard:', error);
      next(error);
    }
  }

  // ====================
  // DASHBOARD EMPLOYEUR
  // ====================
  static async getEmployeurDashboard(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ['id', 'username', 'first_name', 'last_name', 'profile_photo', 'user_type', 'company_name']
      });

      const dashboard = await DashboardService.getEmployeurDashboard(req.user.id);

      res.json({
        success: true,
        data: {
          user,
          ...dashboard
        }
      });
    } catch (error) {
      logger.error('Erreur getEmployeurDashboard:', error);
      next(error);
    }
  }

  // ====================
  // DASHBOARD ADMIN
  // ====================
  static async getAdminDashboard(req, res, next) {
    try {
      const dashboard = await DashboardService.getAdminDashboard();

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Erreur getAdminDashboard:', error);
      next(error);
    }
  }

  // ====================
  // KPI EN TEMPS RÉEL (WebSocket)
  // ====================
  static async getRealtimeKPI(req, res, next) {
    try {
      const { type } = req.params;
      let data;

      switch (type) {
        case 'dj':
          data = await DashboardService.calculateDjKPI(req.user.id);
          break;
        case 'employeur':
          data = await DashboardService.calculateEmployeurKPI(req.user.id);
          break;
        case 'admin':
          data = await DashboardService.getAdminKPIs();
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Type de KPI invalide'
          });
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      logger.error('Erreur getRealtimeKPI:', error);
      next(error);
    }
  }

  // ====================
  // ACTIVITÉ RÉCENTE
  // ====================
  static async getRecentActivity(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const activity = await DashboardService.getRecentActivity(req.user.id, parseInt(limit));

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      logger.error('Erreur getRecentActivity:', error);
      next(error);
    }
  }
}

module.exports = DashboardController;