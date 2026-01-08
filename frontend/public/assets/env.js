// Runtime environment configuration
// Em produção, usa URLs relativas. Em desenvolvimento, usa localhost.
// No GitHub Pages, usa URL absoluta do backend (Cloud Run).
(function (window) {
    window.__env = window.__env || {};

    // Detectar se está em produção (não é localhost)
    var isProduction = window.location.hostname !== 'localhost' &&
                       window.location.hostname !== '127.0.0.1';

    // Detectar se está no GitHub Pages
    var isGitHubPages = window.location.hostname === 'github.io' ||
                        window.location.hostname.endsWith('.github.io');

    // API URL - Configuração baseada no ambiente
    // Se estiver no GitHub Pages, usa URL absoluta do backend (Cloud Run)
    // Se estiver em produção normal (Cloud Run), usa caminho relativo
    // Se estiver em dev, usa localhost
    if (isGitHubPages) {
        // IMPORTANTE: Configure a URL do seu backend Cloud Run aqui
        // Ou defina via variável de ambiente se disponível (window.__BACKEND_URL__)
        // Este valor é apenas um fallback caso não seja configurado via script de deploy
        var backendUrl = window.__BACKEND_URL__ || 'https://planning-poker-385827294764.southamerica-east1.run.app';
        window.__env.apiUrl = backendUrl.endsWith('/api') ? backendUrl : backendUrl + '/api';
    } else if (isProduction) {
        window.__env.apiUrl = '/api';
    } else {
        window.__env.apiUrl = 'http://localhost:8080/api';
    }

    // Google Client ID
    window.__env.googleClientId = '385827294764-ns6i99hvsiu9muvmjrj6rbgjv26sba5g.apps.googleusercontent.com';

}(this));
