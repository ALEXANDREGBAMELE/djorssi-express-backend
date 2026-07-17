// src/validators/paiement.validator.js
const { z } = require('zod');

const createPaiementSchema = z.object({
  montant: z.number().positive().min(1),
  mode_paiement: z.enum(['especes', 'virement', 'mobile_money', 'cheque', 'carte']),
  reference: z.string().optional(),
  candidature_id: z.string().uuid(),
});

const updatePaiementSchema = z.object({
  status: z.enum(['en_attente', 'confirme', 'echoue', 'rembourse']),
  reference: z.string().optional(),
});

const paiementQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['en_attente', 'confirme', 'echoue', 'rembourse']).optional(),
});

module.exports = { createPaiementSchema, updatePaiementSchema, paiementQuerySchema };