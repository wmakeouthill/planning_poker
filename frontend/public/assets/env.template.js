// Runtime environment configuration
// This file is replaced by Docker at runtime with actual values
(function (window) {
    window.__env = window.__env || {};

    // API URL
    window.__env.apiUrl = 'http://localhost:8080/api';

    // Google Client ID - CONFIGURE AQUI ou via Docker
    window.__env.googleClientId = '';

}(this));
