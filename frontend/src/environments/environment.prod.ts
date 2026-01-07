export const environment = {
    production: true,
    apiUrl: (import.meta as any).env?.['NG_APP_API_URL'] || '/api',
    googleClientId: (import.meta as any).env?.['NG_APP_GOOGLE_CLIENT_ID'] || ''
};
