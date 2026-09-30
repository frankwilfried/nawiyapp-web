import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import process from 'node:process';
import { TERMS_VERSION, TERMS, PRIVACY } from '../content/legal';

describe('conditions et confidentialité', () => {
  it('mentionnent la commission de 10 % et les pièces chauffeurs', () => {
    const all = JSON.stringify(TERMS);
    expect(all).toContain('10 %');
    expect(JSON.stringify(PRIVACY)).toContain('carte grise');
  });

  const backendTerms = resolve(process.cwd(), '../nawiyapp-backend/src/lib/terms.js');
  it.skipIf(!existsSync(backendTerms))('même version que le serveur', () => {
    expect(createRequire(backendTerms)(backendTerms).TERMS_VERSION).toBe(TERMS_VERSION);
  });
});
