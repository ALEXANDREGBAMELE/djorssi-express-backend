// src/validators/mission.validator.js
const { z } = require('zod');

// Schéma de création d'une mission
const createMissionSchema = z.object({
  title: z.string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(100, 'Le titre est trop long'),
  description: z.string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(2000, 'La description est trop longue'),
  mission_type: z.enum(['concert', 'soiree', 'mariage', 'anniversaire', 'corporate', 'autre'], {
    errorMap: () => ({ message: 'Type de mission invalide' })
  }),
  lieu: z.string()
    .min(2, 'Le lieu est requis'),
  ville: z.string()
    .min(2, 'La ville est requise'),
  quartier: z.string().optional(),
  adresse_complete: z.string().optional(),
  date_mission: z.string()
    .datetime('Date de mission invalide')
    .refine((date) => new Date(date) > new Date(), {
      message: 'La date doit être dans le futur'
    }),
  date_fin_mission: z.string()
    .datetime('Date de fin invalide')
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, {
      message: 'La date de fin doit être dans le futur'
    }),
  date_limite_candidature: z.string()
    .datetime('Date limite invalide')
    .refine((date) => {
      const now = new Date();
      const deadline = new Date(date);
      return deadline > now;
    }, {
      message: 'La date limite doit être après aujourd\'hui'
    }),
  duree_estimee: z.enum(['1h', '2h', '3h', '4h', '5h', '6h+']).optional(),
  budget: z.number()
    .positive('Le budget doit être positif')
    .optional(),
  budget_negociable: z.boolean().optional().default(true),
  remuneration_details: z.string().optional(),
  
  // ✅ Nombre de DJs requis (peut être multiple)
  nb_djs_requis: z.number()
    .int('Le nombre de DJs doit être un entier')
    .min(1, 'Au moins 1 DJ requis')
    .max(20, 'Maximum 20 DJs')
    .default(1),
  
  // ✅ Nombre minimum de DJs requis
  nb_djs_minimum: z.number()
    .int('Le nombre minimum doit être un entier')
    .min(1, 'Au moins 1 DJ minimum')
    .max(20, 'Maximum 20 DJs')
    .optional()
    .default(1),
  
  exigences: z.array(z.string()).optional(),
  equipement_fourni: z.string().optional(),
  equipement_requis: z.string().optional(),
  contact_nom: z.string().optional(),
  contact_telephone: z.string().optional(),
  contact_email: z.string()
    .email('Email de contact invalide')
    .optional(),
  instructions_speciales: z.string().optional(),
  is_public: z.boolean().optional().default(true),
});

// Schéma de mise à jour d'une mission
const updateMissionSchema = z.object({
  title: z.string()
    .min(3, 'Le titre doit contenir au moins 3 caractères')
    .max(100, 'Le titre est trop long')
    .optional(),
  description: z.string()
    .min(10, 'La description doit contenir au moins 10 caractères')
    .max(2000, 'La description est trop longue')
    .optional(),
  mission_type: z.enum(['concert', 'soiree', 'mariage', 'anniversaire', 'corporate', 'autre']).optional(),
  lieu: z.string().min(2, 'Le lieu est requis').optional(),
  ville: z.string().min(2, 'La ville est requise').optional(),
  quartier: z.string().optional(),
  adresse_complete: z.string().optional(),
  date_mission: z.string()
    .datetime('Date de mission invalide')
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, {
      message: 'La date doit être dans le futur'
    }),
  date_fin_mission: z.string()
    .datetime('Date de fin invalide')
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, {
      message: 'La date de fin doit être dans le futur'
    }),
  date_limite_candidature: z.string()
    .datetime('Date limite invalide')
    .optional()
    .refine((date) => {
      if (!date) return true;
      return new Date(date) > new Date();
    }, {
      message: 'La date limite doit être après aujourd\'hui'
    }),
  duree_estimee: z.enum(['1h', '2h', '3h', '4h', '5h', '6h+']).optional(),
  budget: z.number().positive('Le budget doit être positif').optional(),
  budget_negociable: z.boolean().optional(),
  remuneration_details: z.string().optional(),
  nb_djs_requis: z.number()
    .int('Le nombre de DJs doit être un entier')
    .min(1, 'Au moins 1 DJ requis')
    .max(20, 'Maximum 20 DJs')
    .optional(),
  nb_djs_minimum: z.number()
    .int('Le nombre minimum doit être un entier')
    .min(1, 'Au moins 1 DJ minimum')
    .max(20, 'Maximum 20 DJs')
    .optional(),
  exigences: z.array(z.string()).optional(),
  equipement_fourni: z.string().optional(),
  equipement_requis: z.string().optional(),
  contact_nom: z.string().optional(),
  contact_telephone: z.string().optional(),
  contact_email: z.string().email('Email de contact invalide').optional(),
  instructions_speciales: z.string().optional(),
  status: z.enum(['brouillon', 'publiee', 'en_cours', 'terminee', 'annulee', 'expiree']).optional(),
  is_public: z.boolean().optional(),
}).strict();

// Schéma pour la candidature
const candidatureSchema = z.object({
  message_motivation: z.string()
    .min(10, 'Le message de motivation doit contenir au moins 10 caractères')
    .max(1000, 'Le message est trop long')
    .optional(),
  prix_propose: z.number()
    .positive('Le prix proposé doit être positif')
    .optional(),
});

// ✅ Schéma pour sélectionner des DJs
const selectionnerDJsSchema = z.object({
  dj_ids: z.array(
    z.string().uuid('ID de DJ invalide')
  ).min(1, 'Sélectionnez au moins un DJ'),
  
  remunerations: z.array(
    z.object({
      dj_id: z.string().uuid('ID de DJ invalide'),
      remuneration: z.number()
        .positive('La rémunération doit être positive')
        .optional(),
      notes: z.string().max(500, 'Les notes sont trop longues').optional()
    })
  ).optional(),
}).refine((data) => {
  // Vérifier que tous les dj_ids dans remunerations sont dans dj_ids
  if (data.remunerations) {
    const djIds = new Set(data.dj_ids);
    for (const rem of data.remunerations) {
      if (!djIds.has(rem.dj_id)) {
        return false;
      }
    }
  }
  return true;
}, {
  message: 'Tous les DJs dans les rémunérations doivent être dans la liste des DJs sélectionnés',
  path: ['remunerations']
});

// ✅ Schéma pour confirmer un DJ sélectionné
const confirmerDJSchema = z.object({
  dj_id: z.string().uuid('ID de DJ invalide'),
  confirmation: z.boolean().default(true),
  notes: z.string().max(500, 'Les notes sont trop longues').optional(),
});

// Schéma pour les paramètres de recherche
const missionQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  ville: z.string().optional(),
  mission_type: z.enum(['concert', 'soiree', 'mariage', 'anniversaire', 'corporate', 'autre']).optional(),
  status: z.enum(['brouillon', 'publiee', 'en_cours', 'terminee', 'annulee', 'expiree']).optional(),
  date_debut: z.string().datetime('Date invalide').optional(),
  date_fin: z.string().datetime('Date invalide').optional(),
  budget_min: z.string().regex(/^\d+$/).transform(Number).optional(),
  budget_max: z.string().regex(/^\d+$/).transform(Number).optional(),
  sort_by: z.enum(['createdAt', 'date_mission', 'budget', 'title']).optional(),
  sort_order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

// Schéma pour les paramètres d'URL (ID)
const idParamSchema = z.object({
  id: z.string().uuid('ID de mission invalide')
});

module.exports = {
  createMissionSchema,
  updateMissionSchema,
  candidatureSchema,
  selectionnerDJsSchema,
  confirmerDJSchema,
  missionQuerySchema,
  idParamSchema
};