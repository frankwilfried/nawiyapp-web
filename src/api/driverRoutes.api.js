import client from './client';

export const driverRoutesApi = {
  submit:           (data)       => client.post('/driver-routes', data).then(r => r.data),
  mine:             ()           => client.get('/driver-routes/mine').then(r => r.data),
  list:             (params)     => client.get('/driver-routes', { params }).then(r => r.data),
  approve:          (id, data)   => client.post(`/driver-routes/${id}/approve`, data).then(r => r.data),
  reject:           (id, reason) => client.post(`/driver-routes/${id}/reject`, { reason }).then(r => r.data),
  latestApproved:   (city, since)=> client.get(`/driver-routes/latest-approved?city=${city}&since=${since}`).then(r => r.data),
};
