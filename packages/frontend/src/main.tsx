import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './tokens.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // L'application reste utilisable dans les navigateurs qui refusent le service worker.
    });
  });
}
