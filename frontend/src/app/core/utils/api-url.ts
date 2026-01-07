/**
 * Utilitário para obter a URL base da API.
 * Em produção (não localhost), usa URL relativa.
 * Em desenvolvimento, usa localhost:8080.
 */
export function getApiUrl(): string {
    const isProduction = typeof window !== 'undefined' && 
        window.location.hostname !== 'localhost' && 
        window.location.hostname !== '127.0.0.1';
    
    return isProduction ? '/api' : 'http://localhost:8080/api';
}

