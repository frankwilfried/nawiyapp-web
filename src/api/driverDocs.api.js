import client from './client';

// Pièces justificatives des chauffeurs et contrôle par l'administrateur
export const driverDocsApi = {
  mine:        () => client.get('/taxi/drivers/me/documents').then(r => r.data),
  upload:      (type, file) => client.put(`/taxi/drivers/me/documents/${type}`, file, {
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
  }).then(r => r.data),
  submit:      () => client.post('/taxi/drivers/me/submit').then(r => r.data),
  myFile:      (type) => client.get(`/taxi/drivers/me/documents/${type}/file`, { responseType: 'blob' }).then(r => r.data),

  adminList:   (status) => client.get('/taxi/admin/drivers', { params: { status } }).then(r => r.data),
  adminFile:   (id, type) => client.get(`/taxi/admin/drivers/${id}/documents/${type}/file`, { responseType: 'blob' }).then(r => r.data),
  approve:     (id) => client.post(`/taxi/admin/drivers/${id}/approve`).then(r => r.data),
  reject:      (id, reason, documents) => client.post(`/taxi/admin/drivers/${id}/reject`, { reason, documents }).then(r => r.data),
};
