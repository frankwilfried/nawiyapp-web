import { z } from 'zod';

// Coordonnées GPS valides (Cameroun : lat 1–13, lng 8–17)
const latSchema = z.number().min(1).max(13);
const lngSchema = z.number().min(8).max(17);

export const nodeSchema = z.object({
  // Les nœuds statiques/API ont un id numérique, Google Places un id 'gp_…'
  id:   z.union([z.string().min(1), z.number()]),
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

// Numéro mobile camerounais : 6XXXXXXXX, avec ou sans +237 / espaces
export const cmPhoneSchema = z.string().transform(s => s.replace(/\D/g, '').replace(/^(00)?237/, ''))
  .pipe(z.string().regex(/^6\d{8}$/, { message: 'Numéro mobile invalide (ex. 6 90 12 34 56)' }));

// Le prix n'est pas envoyé : le serveur le calcule (lib/pricing.js)
export const taxiRequestSchema = z.object({
  from_lat:       latSchema,
  from_lng:       lngSchema,
  from_name:      z.string().min(1).max(200),
  to_lat:         latSchema,
  to_lng:         lngSchema,
  to_name:        z.string().min(1).max(200),
  city_slug:      z.enum(['douala','yaounde']),
  category:       z.enum(['eco','confort','moto']),
  payment_method: z.enum(['cash','momo','orange_money']),
  payer_phone:    cmPhoneSchema.optional(),
  offer_price:    z.number().int().positive().optional(), // offre du passager (bornée par le serveur)
  scheduled_at:   z.iso.datetime().optional(),              // course programmée (vérifiée par le serveur)
}).refine(d => d.payment_method === 'cash' || !!d.payer_phone,
  { message: 'Numéro requis pour le paiement mobile', path: ['payer_phone'] });

export const loginSchema = z.object({
  email:    z.email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe trop court (6 caractères min)' }),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(2, { message: 'Nom trop court' }).max(80),
  role: z.enum(['passenger','driver','taxi_driver']).default('passenger'),
});
