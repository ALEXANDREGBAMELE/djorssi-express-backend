// src/routes/reporting.route.js
const express = require('express');
const router = express.Router();
const reportingController = require('../controllers/reporting.controller');
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../../config/permissions');

router.use(authenticate);

// Rapports
router.get('/dj',
  requireRole(['djorssi']),
  reportingController.getDjReport
);

router.get('/employeur',
  requireRole(['employeur']),
  reportingController.getEmployeurReport
);

router.get('/admin',
  requireRole(['admin']),
  reportingController.getAdminReport
);

// Exportations
router.get('/export/pdf',
  reportingController.exportReportPDF
);

router.get('/export/csv',
  reportingController.exportReportCSV
);

// Planification
router.post('/schedule',
  requireRole(['admin']),
  reportingController.scheduleReport
);

router.get('/scheduled',
  requireRole(['admin']),
  reportingController.getScheduledReports
);

module.exports = router;