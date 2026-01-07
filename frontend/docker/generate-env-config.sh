#!/bin/sh

# Script para injetar variáveis de ambiente no index.html em runtime
# Usado pelo Docker para substituir placeholders

# Cria o arquivo env-config.js com as variáveis de ambiente
cat <<EOF > /app/dist/frontend/browser/env-config.js
window.__env = {
  API_URL: '${NG_APP_API_URL:-http://localhost:8080/api}',
  GOOGLE_CLIENT_ID: '${NG_APP_GOOGLE_CLIENT_ID:-}'
};
EOF

echo "Environment config generated successfully"
