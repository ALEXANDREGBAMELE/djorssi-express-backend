// src/validators/message.validator.js
const { z } = require('zod');

// Créer une conversation
const createConversationSchema = z.object({
  participant_id: z.string().uuid('ID de participant invalide'),
  mission_id: z.string().uuid('ID de mission invalide').optional(),
  initial_message: z.string()
    .min(1, 'Le message ne peut pas être vide')
    .max(5000, 'Le message est trop long')
    .optional(),
});

// Envoyer un message
const sendMessageSchema = z.object({
  content: z.string()
    .min(1, 'Le message ne peut pas être vide')
    .max(5000, 'Le message est trop long'),
  type: z.enum(['text', 'image', 'file']).optional().default('text'),
  metadata: z.object({}).optional(),
});

// Marquer comme lu
const markAsReadSchema = z.object({
  message_ids: z.array(z.string().uuid('ID de message invalide')).optional(),
});

// Query params
const messageQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  before: z.string().datetime('Date invalide').optional(),
});

module.exports = {
  createConversationSchema,
  sendMessageSchema,
  markAsReadSchema,
  messageQuerySchema
};