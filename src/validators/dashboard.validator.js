// src/validators/dashboard.validator.js
const { z } = require('zod');

const dashboardQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month', 'quarter', 'year']).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

module.exports = { dashboardQuerySchema };