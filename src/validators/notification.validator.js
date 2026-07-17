// src/validators/notification.validator.js
const { z } = require('zod');

const notificationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  is_read: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  type: z.string().optional(),
});

module.exports = { notificationQuerySchema };