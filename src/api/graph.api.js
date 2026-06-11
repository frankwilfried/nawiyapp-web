import client from './client';

export const graphApi = {
  getGraph:       (city) => client.get(`/graph?city=${city}`).then(r => r.data),
  getFocalPoints: (city) => client.get(`/focal-points?city=${city}`).then(r => r.data),
  getNearest:     (lat, lng, city, limit = 3) =>
    client.get(`/focal-points/nearest?lat=${lat}&lng=${lng}&city=${city}&limit=${limit}`).then(r => r.data),
  getCities:      () => client.get('/cities').then(r => r.data),
};
