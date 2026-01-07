// Environment configuration using runtime injection
// Reads from window.__env set by assets/env.js

declare global {
    interface Window {
        __env: {
            apiUrl: string;
            googleClientId: string;
        };
    }
}

export const environment = {
    production: false,
    apiUrl: window.__env?.apiUrl || 'http://localhost:8080/api',
    googleClientId: window.__env?.googleClientId || ''
};
