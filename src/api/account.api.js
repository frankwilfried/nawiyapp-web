import client from './client';

// Compte passager : historique, reçus, frais en attente, contacts d'urgence
export const accountApi = {
  rides:       (before) => client.get('/taxi/rides/mine', { params: before ? { before } : {} }).then(r => r.data),
  receipt:     (id) => client.get(`/taxi/rides/${id}/receipt`).then(r => r.data.ride),
  cancelScheduled: (id) => client.post(`/taxi/rides/${id}/cancel`).then(r => r.data),
  fees:        () => client.get('/taxi/me/fees').then(r => r.data.pending),
  contacts:    () => client.get('/taxi/me/emergency-contacts').then(r => r.data.contacts),
  setContacts: (contacts) => client.put('/taxi/me/emergency-contacts', { contacts }).then(r => r.data.contacts),
};
