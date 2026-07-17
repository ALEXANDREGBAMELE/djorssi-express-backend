// src/validators/avis.validator.js
const { z } = require('zod');

const createAvisSchema = z.object({
  note: z.number().min(0).max(5),
  commentaire: z.string().max(500).optional(),
  cible_id: z.string().uuid(),
  evaluation_details: z.object({
    ponctualite: z.number().min(0).max(5).optional(),
    professionnalisme: z.number().min(0).max(5).optional(),
    qualite: z.number().min(0).max(5).optional(),
    communication: z.number().min(0).max(5).optional(),
  }).optional(),
});

const repondreAvisSchema = z.object({
  reponse: z.string().min(2).max(500),
});

const avisQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).optional(),
});

module.exports = { createAvisSchema, repondreAvisSchema, avisQuerySchema };