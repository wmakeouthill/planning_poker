// Environment configuration using runtime injection
// Reads from window.__env set by assets/env.js
// Em produção (não localhost), usa URLs relativas

declare global {
  interface Window {
    __env?: {
      apiUrl: string;
      googleClientId: string;
    };
  }
}

// Detectar se está em produção (não é localhost)
const isProduction = typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1';

// Em produção, usar URL relativa. Em dev, usar window.__env ou fallback para localhost
const defaultApiUrl = isProduction ? '/api' : 'http://localhost:8080/api';

export const environment = {
  production: isProduction,
  apiUrl: window.__env?.apiUrl || defaultApiUrl,
  googleClientId: window.__env?.googleClientId || ''
};
