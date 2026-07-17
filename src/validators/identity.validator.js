// src/validators/identity.validator.js
const { z } = require('zod');

const submitDocumentsSchema = z.object({
  documents: z.array(
    z.object({
      document_type: z.enum(['cni', 'passeport', 'permis_conduire', 'carte_sejour', 'autre']),
      document_number: z.string().min(2, 'Le numéro de document est requis'),
      document_front_url: z.string().url('URL de la photo recto invalide'),
      document_back_url: z.string().url('URL de la photo verso invalide').optional(),
      selfie_url: z.string().url('URL du selfie invalide').optional(),
      expiry_date: z.string().datetime('Date d\'expiration invalide').optional(),
    })
  ).min(1, 'Au moins un document est requis'),
});

const approveVerificationSchema = z.object({
  document_id: z.string().uuid('ID de document invalide'),
});

const rejectVerificationSchema = z.object({
  document_id: z.string().uuid('ID de document invalide'),
  reason: z.string().min(5, 'La raison du rejet doit contenir au moins 5 caractères'),
});

const verificationQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'not_submitted']).optional(),
});

module.exports = {
  submitDocumentsSchema,
  approveVerificationSchema,
  rejectVerificationSchema,
  verificationQuerySchema
};