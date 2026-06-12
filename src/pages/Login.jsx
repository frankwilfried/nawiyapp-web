import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const login    = useAuthStore(s => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const data = await login(email, password);
      navigate(data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-nawiy-light">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
        <h1 className="text-3xl font-bold text-nawiy-green text-center mb-1">NAWIYAPP</h1>
        <p className="text-center text-gray-500 text-sm mb-6">Connexion</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg mb-4">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
          />
          <input
            type="password" placeholder="Mot de passe" value={password}
            onChange={e => setPassword(e.target.value)} required
            className="border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-nawiy-green"
          />
          <button
            type="submit" disabled={loading}
            className="bg-nawiy-green text-white rounded-lg py-3 font-semibold hover:bg-nawiy-dark transition disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          <button onClick={() => navigate('/')} className="text-nawiy-green hover:underline">← Retour à la carte</button>
        </p>
      </div>
    </div>
  );
}
