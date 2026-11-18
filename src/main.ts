import './styles/main.css';
import { OmniverseEngine } from './core/OmniverseEngine';

// Register PWA Service Worker when served over HTTPS or localhost
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('[PWA] Service Worker registration skipped:', err);
    });
  });
}

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById('omniverse-canvas') as HTMLCanvasElement | null;
  const uiRoot = document.getElementById('omniverse-ui') as HTMLElement | null;

  if (!canvas || !uiRoot) {
    throw new Error('Missing #omniverse-canvas or #omniverse-ui container in index.html');
  }

  // Prevent browser context menu on right-click aiming & accidental pinch-zoom
  window.addEventListener('contextmenu', (e) => {
    const target = e.target as HTMLElement | null;
    if (!target || target.tagName !== 'INPUT') {
      e.preventDefault();
    }
  });

  const engine = new OmniverseEngine(canvas, uiRoot);
  await engine.boot();
}

void bootstrap();
