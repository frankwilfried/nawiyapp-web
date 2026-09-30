import { describe, it, expect } from 'vitest';
import { searchFormSchema, taxiRequestSchema, loginSchema } from '../lib/schemas';

const node = (id) => ({ id, name: 'Lieu test', lat: 4.05, lng: 9.71, type: 'carrefour' });

describe('searchFormSchema', () => {
  it('valide deux nœuds différents', () => {
    expect(searchFormSchema.safeParse({ fromNode: node('A'), toNode: node('B') }).success).toBe(true);
  });

  it('rejette départ = destination', () => {
    expect(searchFormSchema.safeParse({ fromNode: node('A'), toNode: node('A') }).success).toBe(false);
  });

  it('rejette coordonnées hors Cameroun', () => {
    const outOfRange = { ...node('A'), lat: 50, lng: 2 }; // Paris
    expect(searchFormSchema.safeParse({ fromNode: outOfRange, toNode: node('B') }).success).toBe(false);
  });
});

describe('taxiRequestSchema', () => {
  const base = { from_lat: 4.05, from_lng: 9.71, from_name: 'Akwa', to_lat: 4.06, to_lng: 9.70, to_name: 'Bonaberi', proposed_price: 3000, city_slug: 'douala' };

  it('valide un payload correct', () => {
    expect(taxiRequestSchema.safeParse(base).success).toBe(true);
  });

  it('rejette city_slug invalide', () => {
    expect(taxiRequestSchema.safeParse({ ...base, city_slug: 'paris' }).success).toBe(false);
  });

  it('rejette prix négatif', () => {
    expect(taxiRequestSchema.safeParse({ ...base, proposed_price: -100 }).success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('valide email + password corrects', () => {
    expect(loginSchema.safeParse({ email: 'frank@example.com', password: 'secret123' }).success).toBe(true);
  });

  it('rejette email invalide', () => {
    expect(loginSchema.safeParse({ email: 'pas-un-email', password: 'secret123' }).success).toBe(false);
  });

  it('rejette password trop court', () => {
    expect(loginSchema.safeParse({ email: 'frank@example.com', password: '123' }).success).toBe(false);
  });
});
