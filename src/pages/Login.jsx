import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { otpApi } from '../api/auth.api';
import Icon from '../components/Icon';
import { prettyPhone } from '../lib/phone';

const errMsg = (err, fallback) => err.response?.data?.error?.message || err.response?.data?.error || fallback;
const inputCls = 'w-full h-12 border border-ink-line rounded-lg px-4 text-base text-ink focus:outline-none focus:border-ink';
const primaryBtn = 'w-full h-12 bg-ink text-white text-base font-semibold rounded-lg active:bg-gray-800 disabled:bg-ink-fill disabled:text-ink-3';

/**
 * Connexion par SMS (par défaut) : numéro → code à 6 chiffres → prénom + CGU si nouveau compte.
 * La connexion par email reste possible pour les comptes existants.
 */
export default function Login() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setSession = useAuthStore(s => s.setSession);
  const login = useAuthStore(s => s.login);

  const [step, setStep] = useState('phone'); // phone | code | name | email
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [accept, setAccept] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupToken, setSignupToken] = useState(null);
  const [devCode, setDevCode] = useState(null);
  const [resendIn, setResendIn] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const codeRef = useRef(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const done = (data) => {
    setSession(data);
    const next = params.get('next');
    navigate(next && next.startsWith('/') ? next : data.user.role === 'admin' ? '/admin' : '/', { replace: true });
  };

  const run = async (fn, fallback) => {
    setError(''); setLoading(true);
    try { await fn(); } catch (err) { setError(errMsg(err, fallback)); } finally { setLoading(false); }
  };

  const requestCode = () => run(async () => {
    const r = await otpApi.request(phone);
    setPhone(r.phone);
    setDevCode(r.dev_code || null);
    setResendIn(r.resend_in);
    setCode('');
    setStep('code');
    setTimeout(() => codeRef.current?.focus(), 50);
  }, "Impossible d'envoyer le code, réessaie");

  const verifyCode = (value = code) => run(async () => {
    const r = await otpApi.verify(phone, value);
    if (r.status === 'new_user') { setSignupToken(r.signup_token); setStep('name'); return; }
    done(r);
  }, 'Vérification impossible, réessaie');

  const signup = () => {
    if (!accept) { setError("Accepte les conditions d'utilisation pour continuer"); return; }
    run(async () => done(await otpApi.signup(signupToken, name)), 'Création du compte impossible');
  };

  const emailLogin = () => run(async () => {
    const data = await login(email, password);
    done(data);
  }, 'Email ou mot de passe incorrect');

  const title = { phone: 'Ton numéro de téléphone', code: 'Entre le code reçu', name: 'Bienvenue sur NawiyApp', email: 'Connexion avec email' }[step];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center h-14 px-2">
        <button onClick={() => (step === 'code' || step === 'email' ? setStep('phone') : navigate('/'))} aria-label="Retour"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-ink-fill">
          <Icon name="arrowLeft" size={22} />
        </button>
      </header>

      <main className="flex-1 w-full max-w-sm mx-auto px-4 pb-8">
        <h1 className="text-2xl font-bold text-ink mb-2">{title}</h1>

        {step === 'phone' && (
          <form onSubmit={e => { e.preventDefault(); requestCode(); }} className="flex flex-col gap-4">
            <p className="text-base text-ink-2">On t'envoie un code par SMS pour te connecter ou créer ton compte.</p>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">Numéro mobile</span>
              <div className="flex gap-2">
                <span className="h-12 px-3 flex items-center rounded-lg bg-ink-fill text-ink font-semibold">+237</span>
                <input type="tel" inputMode="tel" autoComplete="tel-national" autoFocus required
                  value={phone} onChange={e => setPhone(e.target.value)} placeholder="6 90 12 34 56" className={inputCls} />
              </div>
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading || phone.replace(/\D/g, '').length < 9} className={primaryBtn}>
              {loading ? 'Envoi…' : 'Recevoir le code'}
            </button>
            <button type="button" onClick={() => { setError(''); setStep('email'); }} className="h-11 text-sm font-semibold text-ink-2 underline">
              Se connecter avec un email
            </button>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={e => { e.preventDefault(); verifyCode(); }} className="flex flex-col gap-4">
            <p className="text-base text-ink-2">Envoyé au <span className="font-semibold text-ink whitespace-nowrap">{prettyPhone(phone)}</span>.</p>
            {devCode && (
              <p className="text-sm bg-amber-100 text-amber-900 rounded-lg px-3 py-2" role="note">
                Mode test, aucun SMS envoyé : ton code est <span className="font-bold tracking-widest">{devCode}</span>
              </p>
            )}
            <input ref={codeRef} type="text" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
              aria-label="Code à 6 chiffres" value={code}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                if (v.length === 6) verifyCode(v);
              }}
              className={`${inputCls} text-center text-2xl font-bold tracking-[0.5em]`} />
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className={primaryBtn}>
              {loading ? 'Vérification…' : 'Continuer'}
            </button>
            <button type="button" onClick={requestCode} disabled={resendIn > 0 || loading}
              className="h-11 text-sm font-semibold text-ink underline disabled:no-underline disabled:text-ink-3">
              {resendIn > 0 ? `Renvoyer le code dans ${resendIn} s` : 'Renvoyer le code'}
            </button>
          </form>
        )}

        {step === 'name' && (
          <form onSubmit={e => { e.preventDefault(); signup(); }} className="flex flex-col gap-4">
            <p className="text-base text-ink-2">Dernière étape : comment doit-on t'appeler ? Ton prénom est montré au chauffeur.</p>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-ink">Prénom</span>
              <input autoFocus required autoComplete="given-name" maxLength={60} value={name}
                onChange={e => setName(e.target.value)} className={inputCls} />
            </label>
            <label className="flex items-start gap-2 text-sm text-ink">
              <input type="checkbox" checked={accept} onChange={e => setAccept(e.target.checked)} className="mt-1 w-4 h-4" />
              <span>
                J'accepte les <Link to="/conditions" className="underline font-semibold">conditions d'utilisation</Link> et
                la <Link to="/confidentialite" className="underline font-semibold">politique de confidentialité</Link>.
              </span>
            </label>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading || name.trim().length < 2 || !accept} className={primaryBtn}>
              {loading ? 'Création…' : 'Créer mon compte'}
            </button>
          </form>
        )}

        {step === 'email' && (
          <form onSubmit={e => { e.preventDefault(); emailLogin(); }} className="flex flex-col gap-4">
            <p className="text-base text-ink-2">Pour les comptes créés avec un email.</p>
            <input type="email" autoComplete="email" placeholder="Email" required value={email}
              onChange={e => setEmail(e.target.value)} className={inputCls} aria-label="Email" />
            <input type="password" autoComplete="current-password" placeholder="Mot de passe" required value={password}
              onChange={e => setPassword(e.target.value)} className={inputCls} aria-label="Mot de passe" />
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <button type="submit" disabled={loading} className={primaryBtn}>{loading ? '…' : 'Se connecter'}</button>
          </form>
        )}
      </main>
    </div>
  );
}
