import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[NawiyApp] Erreur capturée:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white px-6 text-center z-50">
          <div className="text-5xl mb-4">🗺️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Oups, une erreur s'est produite</h2>
          <p className="text-sm text-gray-500 mb-6 max-w-xs">
            L'application a rencontré un problème inattendu. Recharge la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-nawiy-green text-white px-6 py-3 rounded-xl font-semibold hover:bg-nawiy-dark transition"
          >
            Recharger
          </button>
          {import.meta.env.DEV && (
            <details className="mt-6 text-left max-w-sm w-full">
              <summary className="text-xs text-gray-400 cursor-pointer">Détails (dev)</summary>
              <pre className="text-xs text-red-500 mt-2 overflow-auto bg-red-50 p-3 rounded-lg">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
