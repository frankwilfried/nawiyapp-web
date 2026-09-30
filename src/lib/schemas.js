import { z } from 'zod';

// Coordonnées GPS valides (Cameroun : lat 1–13, lng 8–17)
const latSchema = z.number().min(1).max(13);
const lngSchema = z.number().min(8).max(17);

export const nodeSchema = z.object({
  id:   z.string().min(1),
  name: z.string().min(1),
  lat:  latSchema,
  lng:  lngSchema,
  type: z.enum(['carrefour','quartier','marche','universite','transport','autre','lieu']).optional(),
});

export const searchFormSchema = z.object({
  fromNode: nodeSchema,
  toNode:   nodeSchema,
}).refine(
  data => data.fromNode.id !== data.toNode.id,
  { message: 'Le départ et la destination doivent être différents', path: ['toNode'] }
);

export const taxiRequestSchema = z.object({
  from_lat:       latSchema,
  from_lng:       lngSchema,
  from_name:      z.string().min(1).max(200),
  to_lat:         latSchema,
  to_lng:         lngSchema,
  to_name:        z.string().min(1).max(200),
  proposed_price: z.number().positive(),
  city_slug:      z.enum(['douala','yaounde']),
});

export const loginSchema = z.object({
  email:    z.email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe trop court (6 caractères min)' }),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, { message: 'Nom trop court' }).max(80),
  role: z.enum(['passenger','driver','taxi_driver']).default('passenger'),
});
