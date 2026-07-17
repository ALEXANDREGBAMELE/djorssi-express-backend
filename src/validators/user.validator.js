const { z } = require('zod');

// Schéma pour la mise à jour du profil (utilisateur connecté)
const updateProfileSchema = z.object({
  first_name: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom est trop long')
    .optional(),
  last_name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom est trop long')
    .optional(),
  quartier: z.string()
    .optional(),
  ville: z.string()
    .optional(),
  pays: z.string()
    .optional(),
  company_name: z.string()
    .optional(),
  company_siret: z.string()
    .optional(),
  bio: z.string()
    .max(500, 'La bio est trop longue (max 500 caractères)')
    .optional(),
  profile_photo: z.string()
    .url('URL de photo invalide')
    .optional(),
}).strict(); // Interdit les champs non prévus

// Schéma pour l'admin - mise à jour d'un utilisateur
const adminUpdateUserSchema = z.object({
  first_name: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom est trop long')
    .optional(),
  last_name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom est trop long')
    .optional(),
  quartier: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  company_name: z.string().optional(),
  company_siret: z.string().optional(),
  bio: z.string().max(500, 'La bio est trop longue').optional(),
  profile_photo: z.string().url('URL de photo invalide').optional(),
  user_type: z.enum(['djorssi', 'employeur'], {
    errorMap: () => ({ message: "user_type doit être 'djorssi' ou 'employeur'" })
  }).optional(),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
}).strict();

// Schéma pour le changement de mot de passe
const changePasswordSchema = z.object({
  current_password: z.string()
    .min(1, 'Le mot de passe actuel est requis'),
  new_password: z.string()
    .min(6, 'Le nouveau mot de passe doit contenir au moins 6 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  confirm_password: z.string()
    .min(1, 'La confirmation du mot de passe est requise')
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm_password']
});

// Schéma pour l'admin - création d'un utilisateur
const adminCreateUserSchema = z.object({
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur est trop long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  email: z.string()
    .email('Email invalide')
    .min(1, 'Email requis'),
  phone: z.string()
    .regex(/^[0-9]{8,10}$/, 'Numéro de téléphone invalide (8-10 chiffres)')
    .min(1, 'Numéro de téléphone requis'),
  password: z.string()
    .min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  first_name: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom est trop long'),
  last_name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom est trop long'),
  user_type: z.enum(['djorssi', 'employeur'], {
    errorMap: () => ({ message: "user_type doit être 'djorssi' ou 'employeur'" })
  }),
  quartier: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  is_company: z.boolean().optional().default(false),
  company_name: z.string().optional(),
  company_siret: z.string().optional(),
  bio: z.string().optional(),
  profile_photo: z.string().url('URL de photo invalide').optional(),
  is_active: z.boolean().optional().default(true),
  is_verified: z.boolean().optional().default(false),
});

// Schéma pour les paramètres d'URL (ID)
const idParamSchema = z.object({
  id: z.string().uuid('ID utilisateur invalide')
});

// Schéma pour la recherche d'utilisateurs (admin)
const userQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
  search: z.string().optional(),
  user_type: z.enum(['djorssi', 'employeur']).optional(),
  is_active: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  is_verified: z.enum(['true', 'false']).transform(val => val === 'true').optional(),
  sort_by: z.enum(['createdAt', 'updatedAt', 'first_name', 'last_name', 'email']).optional(),
  sort_order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

module.exports = {
  updateProfileSchema,
  adminUpdateUserSchema,
  changePasswordSchema,
  adminCreateUserSchema,
  idParamSchema,
  userQuerySchema
};