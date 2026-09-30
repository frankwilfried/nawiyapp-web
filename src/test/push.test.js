import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8Array } from '../lib/push';

describe('clé VAPID', () => {
  it('décode le base64url sans padding', () => {
    const bytes = new Uint8Array([4, 250, 255, 0, 62, 63]);
    const b64url = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(Array.from(urlBase64ToUint8Array(b64url))).toEqual(Array.from(bytes));
  });
});
