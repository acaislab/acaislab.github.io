import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Handle GitHub Pages SPA redirect
const redirect = sessionStorage.redirect;
if (redirect && redirect !== window.location.href) {
  delete sessionStorage.redirect;
  window.history.replaceState(null, '', redirect);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

