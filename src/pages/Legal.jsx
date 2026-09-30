import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { TERMS, PRIVACY, TERMS_VERSION, LEGAL_DRAFT } from '../content/legal';

/** Pages CGU (/conditions) et confidentialité (/confidentialite). */
export default function Legal({ doc }) {
  const navigate = useNavigate();
  const content = doc === 'privacy' ? PRIVACY : TERMS;
  const other = doc === 'privacy' ? ['/conditions', "Conditions d'utilisation"] : ['/confidentialite', 'Politique de confidentialité'];

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 bg-white border-b border-ink-line flex items-center gap-2 px-2 h-14 z-10">
        <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label="Retour"
          className="w-11 h-11 flex items-center justify-center rounded-full active:bg-ink-fill">
          <Icon name="arrowLeft" size={22} />
        </button>
        <h1 className="text-lg font-bold text-ink truncate">{content.title}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {LEGAL_DRAFT && (
          <p className="text-sm bg-amber-100 text-amber-900 rounded-lg px-3 py-2 mb-4" role="note">
            Modèle en cours de validation juridique : ce texte peut encore changer avant le lancement.
          </p>
        )}
        <p className="text-sm text-ink-2 mb-1">Version du {new Date(TERMS_VERSION).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <p className="text-base text-ink leading-relaxed">{content.intro}</p>

        {content.sections.map(([title, paragraphs], i) => (
          <section key={title} className="mt-6" aria-labelledby={`s${i}`}>
            <h2 id={`s${i}`} className="text-lg font-bold text-ink mb-2">{i + 1}. {title}</h2>
            <ul className="flex flex-col gap-2">
              {paragraphs.map(p => <li key={p} className="text-base text-ink leading-relaxed">{p}</li>)}
            </ul>
          </section>
        ))}

        <p className="mt-8 pt-4 border-t border-ink-line text-sm">
          <Link to={other[0]} className="text-nawiy-600 font-semibold underline">{other[1]}</Link>
        </p>
      </main>
    </div>
  );
}
