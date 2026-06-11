import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Global error handler for Tauri WebView debugging
window.addEventListener('error', (e) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:20px;font-family:sans-serif;color:#333">
      <h2 style="color:#c00">Runtime Error</h2>
      <pre style="background:#f5f5f5;padding:10px;border-radius:4px;overflow:auto">${e.message}\n${e.filename}:${e.lineno}:${e.colno}</pre>
    </div>`;
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `<div style="padding:20px;font-family:sans-serif;color:#333">
      <h2 style="color:#c00">Unhandled Promise Rejection</h2>
      <pre style="background:#f5f5f5;padding:10px;border-radius:4px;overflow:auto">${e.reason}</pre>
    </div>`;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Register a lightweight PWA service worker in production builds.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register('./service-worker.js')
    .catch((err: Error) => console.error('Service worker registration failed:', err));
}
