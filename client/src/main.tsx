import '@/lib/fetchAuthInterceptor';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { setupPWA } from './lib/pwa';
import log from '@/lib/log';
import { Providers } from '@/app/Providers';

setupPWA();

console.log('🎯 [REACT] Starting React application mount process...');

const root = document.getElementById('root');
if (!root) {
  console.error('❌ [REACT] Root element (#root) not found in DOM!');
  document.body.innerHTML =
    '<div style="padding:20px;color:red;border:2px solid red;background:#ffe6e6;"><h2>🚨 React Mount Failed</h2><p>Root element (#root) not found in DOM</p></div>';
} else {
  try {
    const reactRoot = ReactDOM.createRoot(root);
    console.log('🚀 [REACT] Rendering full application...');
    reactRoot.render(
      <Providers>
        {/* ✅ GitHub Pages fix: router must have correct basename */}
        <BrowserRouter basename="/staff-audit">
          <App />
        </BrowserRouter>
      </Providers>
    );
    console.log('✅ [REACT] Full app render completed!');
  } catch (error) {
    console.error('🚨 [REACT] CRITICAL ERROR during React mount:', error);
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText =
      'padding:20px;color:red;border:2px solid red;background:#ffe6e6;margin:20px;';
    errorDiv.innerHTML = `<h2>🚨 React Mount Error</h2><p><strong>Error:</strong> ${
      error instanceof Error ? error.message : String(error)
    }</p><pre>${error instanceof Error ? error.stack : 'No stack trace'}</pre>`;
    document.body.appendChild(errorDiv);
  }
}
