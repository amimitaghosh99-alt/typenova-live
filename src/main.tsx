import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ErrorBoundary onReset={() => {
        localStorage.clear();
        window.location.reload();
      }}>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
