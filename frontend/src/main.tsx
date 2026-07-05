import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './pwa/pwa.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerSW'

// Registrar Service Worker
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
