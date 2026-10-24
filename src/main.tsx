import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dpad-navigation.css'
import App from './App.tsx'
import { iniciar as iniciarTelemetria } from './services/telemetria'
import { migrarUmaVez } from './services/listas'
import { iniciarTv } from './plataforma/tv'
import { sondarProxy } from './utils/streamUrl'

const CHAVE_RECARREGAR_CHUNK = 'nvnplus-recarregar-chunk-em';
window.addEventListener('vite:preloadError', (event) => {
  let ultimaRecarga = 0;
  try { ultimaRecarga = Number(sessionStorage.getItem(CHAVE_RECARREGAR_CHUNK)) || 0; } catch { /* segue sem storage */ }
  if (Date.now() - ultimaRecarga < 30_000) return;
  event.preventDefault();
  try { sessionStorage.setItem(CHAVE_RECARREGAR_CHUNK, String(Date.now())); } catch { /* tenta recarregar mesmo assim */ }
  window.location.reload();
});

migrarUmaVez()
iniciarTv()
window.setInterval(() => { void sondarProxy() }, 10 * 60 * 1000)
iniciarTelemetria()

const sondagem = Promise.race([sondarProxy(), new Promise<void>((ok) => window.setTimeout(ok, 1500))])
void sondagem.finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})

if ('serviceWorker' in navigator && import.meta.env.PROD && !import.meta.env.VITE_TV && location.protocol === 'https:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
