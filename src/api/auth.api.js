import client from './client';

export const authApi = {
  register: (data) => client.post('/auth/register', data).then(r => r.data),
  login:    (data) => client.post('/auth/login',    data).then(r => r.data),
  refresh:  (refreshToken) => client.post('/auth/refresh', { refreshToken }).then(r => r.data),
  me:       () => client.get('/auth/me').then(r => r.data),
};

// Connexion par SMS
export const otpApi = {
  request: (phone) => client.post('/auth/otp/request', { phone }).then(r => r.data),
  verify:  (phone, code, link = false) => client.post('/auth/otp/verify', { phone, code, link }).then(r => r.data),
  signup:  (signup_token, full_name) => client.post('/auth/otp/signup', { signup_token, full_name, accept_terms: true }).then(r => r.data),
};
