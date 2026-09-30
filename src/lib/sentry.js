import * as Sentry from '@sentry/react';

const DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!DSN) return; // pas de DSN = pas de Sentry (dev local)

  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE, // 'development' | 'production'
    release: import.meta.env.VITE_APP_VERSION || '0.1.0',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Ignore les erreurs WebSocket de reconnexion (attendues)
      if (event.exception?.values?.[0]?.value?.includes('WebSocket connection')) return null;
      // Ignore les erreurs OSRM (timeout réseau normal)
      if (event.exception?.values?.[0]?.value?.includes('OSRM')) return null;
      return event;
    },
  });
}

export function captureError(error, context = {}) {
  if (!DSN) { console.error('[NawiyApp]', error, context); return; }
  Sentry.withScope(scope => {
    Object.entries(context).forEach(([k, v]) => scope.setExtra(k, v));
    Sentry.captureException(error);
  });
}

export function setUserContext(user) {
  if (!DSN) return;
  Sentry.setUser(user ? { id: String(user.id), email: user.email } : null);
}
