import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { API_BASE } from './lib/urls';

// Debug: surface API base at startup (remove after verifying deployment)
// eslint-disable-next-line no-console
console.log('[Lumora] API_BASE =', API_BASE || '(empty)');
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
