import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CrmProvider } from './state/CrmContext';
import { ToastProvider } from './state/ToastContext';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <CrmProvider>
          <App />
        </CrmProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);
