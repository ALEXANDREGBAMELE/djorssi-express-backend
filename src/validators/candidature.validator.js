// src/validators/candidature.validator.js
const { z } = require('zod');

// Schéma pour postuler à une mission
const postulerSchema = z.object({
  message_motivation: z.string()
    .min(10, 'Le message de motivation doit contenir au moins 10 caractères')
    .max(1000, 'Le message est trop long')
    .optional(),
  prix_propose: z.number()
    .positive('Le prix proposé doit être positif')
    .optional(),
});

// Schéma pour traiter une candidature (accepter/refuser)
const traiterCandidatureSchema = z.object({
  status: z.enum(['acceptee', 'refusee'], {
    errorMap: () => ({ message: 'Le statut doit être "acceptee" ou "refusee"' })
  }),
  commentaire: z.string()
    .max(500, 'Le commentaire est trop long')
    .optional(),
  remuneration: z.number()
    .positive('La rémunération doit être positive')
    .optional(),
});

// Schéma pour évaluer une candidature (après mission)
const evaluerCandidatureSchema = z.object({
  ponctualite: z.number()
    .min(0, 'La note doit être entre 0 et 5')
    .max(5, 'La note doit être entre 0 et 5')
    .optional(),
  professionnalisme: z.number()
    .min(0, 'La note doit être entre 0 et 5')
    .max(5, 'La note doit être entre 0 et 5')
    .optional(),
  qualite_prestation: z.number()
    .min(0, 'La note doit être entre 0 et 5')
    .max(5, 'La note doit être entre 0 et 5')
    .optional(),
  communication: z.number()
    .min(0, 'La note doit être entre 0 et 5')
    .max(5, 'La note doit être entre 0 et 5')
    .optional(),
  commentaire: z.string()
    .max(500, 'Le commentaire est trop long')
    .optional(),
  note_globale: z.number()
    .min(0, 'La note doit être entre 0 et 5')
    .max(5, 'La note doit être entre 0 et 5')
    .optional(),
});

// Schéma pour le paiement
const paiementSchema = z.object({
  montant: z.number()
    .positive('Le montant doit être positif')
    .min(1, 'Le montant minimum est de 1'),
  mode_paiement: z.enum(['especes', 'virement', 'mobile_money', 'cheque'], {
    errorMap: () => ({ message: 'Mode de paiement invalide' })
  }),
  reference: z.string().optional(),
  date_paiement: z.string()
    .datetime('Date de paiement invalide')
    .optional()
});

// Schéma pour les paramètres de recherche
const candidatureQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  status: z.enum(['en_attente', 'acceptee', 'refusee', 'annulee']).optional(),
  mission_id: z.string().uuid('ID de mission invalide').optional(),
  dj_id: z.string().uuid('ID de DJ invalide').optional(),
  date_debut: z.string().datetime('Date invalide').optional(),
  date_fin: z.string().datetime('Date invalide').optional(),
  paiement_status: z.enum(['non_paye', 'en_attente', 'paye', 'rembourse']).optional(),
  sort_by: z.enum(['createdAt', 'updatedAt', 'prix_propose', 'status']).optional(),
  sort_order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

const idParamSchema = z.object({
  id: z.string().uuid('ID de candidature invalide')
});

const preSelectionnerSchema = z.object({
  message: z.string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(1000, 'Le message est trop long'),
  conversation_id: z.string().uuid('ID de conversation invalide').optional(),
});

// Planifier un entretien
const planifierEntretienSchema = z.object({
  date: z.string()
    .datetime('Date invalide')
    .refine((date) => new Date(date) > new Date(), {
      message: 'La date doit être dans le futur'
    }),
  lieu: z.string().optional(),
  type: z.enum(['presentiel', 'visio', 'telephone', 'chat']).default('chat'),
  message: z.string()
    .min(10, 'Le message doit contenir au moins 10 caractères')
    .max(1000, 'Le message est trop long'),
});

// Confirmer la participation à l'entretien (DJ)
const confirmerEntretienSchema = z.object({
  confirmation: z.boolean().default(true),
  notes: z.string().optional(),
});


module.exports = {
  postulerSchema,
  traiterCandidatureSchema,
  evaluerCandidatureSchema,
  paiementSchema,
  candidatureQuerySchema,
  idParamSchema,
  preSelectionnerSchema,
  planifierEntretienSchema,
  confirmerEntretienSchema,
};