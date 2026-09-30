import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import apiClient from '../api/client';

export default function Login() {
  const [mode, setMode]          = useState('login'); // 'login' | 'register'
  const [email, setEmail]        = useState('');
  const [password, setPassword]  = useState('');
  const [fullName, setFullName]  = useState('');
  const [accept, setAccept]      = useState(false);
  const [error, setError]        = useState('');
  const [loading, setLoading]    = useState(false);
  const login    = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'login') {
        const data = await login(email, password);
        navigate(data.user.role === 'admin' ? '/admin' : '/');
      } else {
        if (!fullName.trim()) { setError('Ton prénom est requis'); setLoading(false); return; }
        if (!accept) { setError("Accepte les conditions d'utilisation pour continuer"); setLoading(false); return; }
        await apiClient.post('/auth/register', { full_name: fullName, email, password, accept_terms: true });
        const data = await login(email, password);
        navigate(data.user.role === 'admin' ? '/admin' : '/');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || (mode === 'login' ? 'Email ou mot de passe incorrect' : 'Erreur lors de la création du compte'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nawiy-light">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-nawiy-green text-center mb-1">NAWIYAPP</h1>
        <p className="text-center text-gray-500 text-sm mb-6">
          {mode === 'login' ? 'Connexion' : 'Créer un compte'}
        </p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === 'register' && (
            <input
              type="text" placeholder="Ton prénom *" value={fullName}
              onChange={e => setFullName(e.target.value)} required
              className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
            />
          )}
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
          />
          <input
            type="password" placeholder="Mot de passe" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={mode === 'register' ? 8 : undefined}
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
          />
          {mode === 'register' && (
            <label className="flex items-start gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="mt-1 w-4 h-4" required />
              <span>
                J'accepte les <Link to="/conditions" className="text-nawiy-600 underline">conditions d'utilisation</Link> et
                la <Link to="/confidentialite" className="text-nawiy-600 underline">politique de confidentialité</Link>.
              </span>
            </label>
          )}
          <button
            type="submit" disabled={loading}
            className="bg-nawiy-green text-white rounded-lg py-3 font-semibold hover:bg-nawiy-dark transition disabled:opacity-60"
          >
            {loading ? '...' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </button>
        </form>

        <div className="text-center mt-5 flex flex-col gap-2">
          {mode === 'login' ? (
            <button onClick={() => { setMode('register'); setError(''); }}
              className="text-nawiy-green text-sm font-medium hover:underline">
              Pas encore de compte ? Créer un compte →
            </button>
          ) : (
            <button onClick={() => { setMode('login'); setError(''); }}
              className="text-nawiy-green text-sm font-medium hover:underline">
              ← J'ai déjà un compte
            </button>
          )}
          <button onClick={() => navigate('/')} className="text-xs text-gray-400 hover:underline">
            ← Retour à la carte
          </button>
        </div>
      </div>
    </div>
  );
}
