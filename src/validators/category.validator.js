// src/validators/category.validator.js
const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().min(2).max(50),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  parent_id: z.string().uuid().optional(),
  is_active: z.boolean().optional().default(true),
  order: z.number().optional().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

module.exports = { createCategorySchema, updateCategorySchema };