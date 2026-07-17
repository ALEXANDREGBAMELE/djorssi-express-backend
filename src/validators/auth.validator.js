const { z } = require('zod');

const registerSchema = z.object({
  // Identifiants
  username: z.string()
    .min(3, 'Le nom d\'utilisateur doit contenir au moins 3 caractères')
    .max(30, 'Le nom d\'utilisateur est trop long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores'),
  email: z.string()
    .email('Email invalide')
    .min(1, 'Email requis'),
  phone: z.string()
    .regex(/^[0-9]{10,15}$/, 'Numéro de téléphone invalide (10-15 chiffres)')
    .min(10, 'Numéro de téléphone requis'),
  
  // Identité
  first_name: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom est trop long'),
  last_name: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom est trop long'),
  
  // Sécurité
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  
  // Localisation
  quartier: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional().default('Côte d\'Ivoire'),
  
  // Type d'utilisateur
  user_type: z.enum(['djorssi', 'employeur', 'admin'], {
    errorMap: () => ({ message: 'Le type doit être "djorssi" ou "employeur" ou admin' })
  }),
  
  // Entreprise
  is_company: z.boolean().optional().default(false),
  company_name: z.string().optional(),
  company_siret: z.string().optional(),
  
  // Profil - ✅ Correction : max() avant optional()
  bio: z.string().max(500, 'La bio est trop longue').optional(),
  profile_photo: z.string().url('URL invalide').optional(),
});

const loginSchema = z.object({
  email: z.string()
    .email('Email invalide')
    .min(1, 'Email requis'),
  password: z.string()
    .min(1, 'Mot de passe requis')
});

module.exports = {
  registerSchema,
  loginSchema
};