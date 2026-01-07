// Runtime environment configuration
// Em produção, usa URLs relativas. Em desenvolvimento, usa localhost.
(function (window) {
    window.__env = window.__env || {};

    // Detectar se está em produção (não é localhost)
    var isProduction = window.location.hostname !== 'localhost' && 
                       window.location.hostname !== '127.0.0.1';

    // API URL - Em produção usa caminho relativo, em dev usa localhost
    window.__env.apiUrl = isProduction ? '/api' : 'http://localhost:8080/api';

    // Google Client ID
    window.__env.googleClientId = '385827294764-ns6i99hvsiu9muvmjrj6rbgjv26sba5g.apps.googleusercontent.com';

}(this));
