// src/validators/reporting.validator.js
const { z } = require('zod');

const reportQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional().default('month'),
  type: z.enum(['dj', 'employeur', 'admin']).optional(),
  format: z.enum(['json', 'pdf', 'csv']).optional().default('json'),
});

const scheduleReportSchema = z.object({
  type: z.enum(['dj', 'employeur', 'admin']),
  period: z.enum(['daily', 'weekly', 'monthly']),
  recipients: z.array(z.string().email('Email invalide')),
  format: z.enum(['pdf', 'csv']).optional().default('pdf'),
});

module.exports = { reportQuerySchema, scheduleReportSchema };