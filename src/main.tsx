import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
import { isChunkLoadError } from './lib/lazyWithRetry'

// Handle Vite dynamic import preload failures (fired when a new deployment invalidates chunk hashes)
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    console.warn('[TypeNova] Vite preload error caught:', event);
    const reloadKey = 'typenova_vite_preload_reload';
    const lastReload = sessionStorage.getItem(reloadKey);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
      sessionStorage.setItem(reloadKey, String(now));
      window.location.reload();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      console.warn('[TypeNova] Unhandled dynamic import failure caught:', event.reason);
      const reloadKey = 'typenova_unhandled_chunk_reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary onReset={() => {
        window.location.reload();
      }}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)

