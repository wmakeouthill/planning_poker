/**
 * Utilitário para obter a URL base da API.
 * Lê de window.__env.apiUrl configurado por assets/env.js em runtime.
 * O env.js detecta automaticamente se está no GitHub Pages e usa URL absoluta do backend.
 * Em produção normal (Cloud Run), usa URL relativa.
 * Em desenvolvimento, usa localhost:8080.
 *
 * Nota: A declaração global de Window.__env está em src/environments/environment.ts
 */

export function getApiUrl(): string {
    // Primeiro, tentar ler de window.__env (configurado por env.js em runtime)
    if (typeof window !== 'undefined' && window.__env?.apiUrl) {
        return window.__env.apiUrl;
    }

    // Fallback: detecção simples baseada no hostname
    const isProduction = typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost' &&
        window.location.hostname !== '127.0.0.1';

    return isProduction ? '/api' : 'http://localhost:8080/api';
}

