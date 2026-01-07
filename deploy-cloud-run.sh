#!/bin/bash
# Script de deploy para Google Cloud Run com Cloud SQL e Secret Manager
# Uso: ./deploy-cloud-run.sh [PROJECT_ID] [REGION] [CLOUD_SQL_INSTANCE]

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Deploy do Planning Poker para Google Cloud Run${NC}"
echo -e "${GREEN}   Com Cloud SQL e Secret Manager${NC}"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI não está instalado. Instale em: https://cloud.google.com/sdk/docs/install${NC}"
    exit 1
fi

# Verificar se está autenticado
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Você não está autenticado. Fazendo login...${NC}"
    gcloud auth login
fi

# Solicitar PROJECT_ID se não fornecido
if [ -z "$1" ]; then
    echo -e "${YELLOW}📋 Projetos disponíveis:${NC}"
    gcloud projects list --format="table(projectId,name)"
    echo ""
    read -p "Digite o PROJECT_ID: " PROJECT_ID
else
    PROJECT_ID=$1
fi

# Definir região (default: us-central1)
REGION=${2:-us-central1}

# Configurar projeto
echo -e "${GREEN}⚙️  Configurando projeto: ${PROJECT_ID}${NC}"
gcloud config set project "$PROJECT_ID"

# Habilitar APIs necessárias
echo -e "${GREEN}🔧 Habilitando APIs necessárias...${NC}"
gcloud services enable \
    cloudbuild.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    containerregistry.googleapis.com \
    sqladmin.googleapis.com \
    --project="$PROJECT_ID"

# Função para ler variáveis do arquivo .env
read_env_file() {
    local file_path="${1:-.env}"
    declare -A env_vars
    
    if [ -f "$file_path" ]; then
        echo -e "${GREEN}📄 Lendo variáveis do arquivo .env...${NC}"
        while IFS='=' read -r key value || [ -n "$key" ]; do
            # Ignorar comentários e linhas vazias
            [[ "$key" =~ ^[[:space:]]*# ]] && continue
            [[ -z "$key" ]] && continue
            
            # Remover espaços e aspas
            key=$(echo "$key" | xargs)
            value=$(echo "$value" | xargs | sed "s/^['\"]//; s/['\"]$//")
            
            if [ -n "$key" ] && [ -n "$value" ]; then
                env_vars["$key"]="$value"
            fi
        done < <(grep -v '^[[:space:]]*#' "$file_path" | grep '=')
    else
        echo -e "${YELLOW}⚠️  Arquivo .env não encontrado. Usando apenas secrets existentes.${NC}"
    fi
    
    # Retornar via variável global (bash não retorna arrays facilmente)
    for key in "${!env_vars[@]}"; do
        export "ENV_${key}=${env_vars[$key]}"
    done
}

# Ler variáveis do .env ANTES de usar
read_env_file

# Verificar Cloud SQL Instance
echo ""
echo -e "${GREEN}🗄️  Configurando Cloud SQL...${NC}"
echo -e "${GREEN}   ℹ️  Usando a MESMA instância Cloud SQL do projeto de referência${NC}"
echo -e "${GREEN}   ℹ️  Mas com um banco de dados PRÓPRIO (planningpoker)${NC}"
echo ""

if [ -z "$3" ]; then
    echo -e "${YELLOW}📋 Instâncias Cloud SQL disponíveis:${NC}"
    gcloud sql instances list --project="$PROJECT_ID" --format="table(name,region,databaseVersion,status)" || echo -e "${YELLOW}   Nenhuma instância encontrada${NC}"
    echo ""
    read -p "Digite o nome da instância Cloud SQL (formato: PROJECT_ID:REGION:INSTANCE_NAME ou INSTANCE_NAME): " CLOUD_SQL_INSTANCE_INPUT
    CLOUD_SQL_INSTANCE="$CLOUD_SQL_INSTANCE_INPUT"
else
    CLOUD_SQL_INSTANCE=$3
fi

# Validar formato da instância Cloud SQL
if [[ "$CLOUD_SQL_INSTANCE" != *":"* ]]; then
    # Se não tem formato completo, construir
    CLOUD_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${CLOUD_SQL_INSTANCE}"
else
    CLOUD_SQL_CONNECTION_NAME="$CLOUD_SQL_INSTANCE"
fi

echo -e "${BLUE}   Usando conexão Cloud SQL: ${CLOUD_SQL_CONNECTION_NAME}${NC}"

# Obter número do projeto para permissões
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

# Configurar permissões para Cloud Run acessar Cloud SQL
echo -e "${GREEN}🔗 Configurando conexão Cloud SQL...${NC}"
CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/cloudsql.client" \
    --quiet || echo -e "${YELLOW}⚠️  Permissão já configurada (continuando...)${NC}"

# Solicitar informações do banco
echo ""
echo -e "${GREEN}💾 Configurando banco de dados...${NC}"
echo -e "${GREEN}   ℹ️  Será criado um banco de dados PRÓPRIO nesta instância Cloud SQL${NC}"
echo ""

read -p "Digite o nome do banco de dados (default: planningpoker): " DB_NAME
DB_NAME=${DB_NAME:-planningpoker}

read -p "Digite o usuário do banco de dados (default: planningpoker_user): " DB_USERNAME
DB_USERNAME=${DB_USERNAME:-planningpoker_user}

# Extrair apenas o nome da instância (sem PROJECT_ID:REGION:)
INSTANCE_NAME_ONLY="$CLOUD_SQL_CONNECTION_NAME"
if [[ "$CLOUD_SQL_CONNECTION_NAME" == *":"* ]]; then
    INSTANCE_NAME_ONLY=$(echo "$CLOUD_SQL_CONNECTION_NAME" | cut -d':' -f3)
fi

# Verificar se o banco de dados existe, se não, criar
echo ""
echo -e "${GREEN}🔍 Verificando banco de dados '${DB_NAME}'...${NC}"
DB_EXISTS=$(gcloud sql databases list --instance="$INSTANCE_NAME_ONLY" --project="$PROJECT_ID" --format="value(name)" 2>/dev/null | grep -Fx "$DB_NAME" || echo "")

if [ -z "$DB_EXISTS" ]; then
    echo -e "${YELLOW}📝 Banco de dados '${DB_NAME}' não existe. Criando...${NC}"
    if gcloud sql databases create "$DB_NAME" --instance="$INSTANCE_NAME_ONLY" --project="$PROJECT_ID" 2>/dev/null; then
        echo -e "${GREEN}✅ Banco de dados '${DB_NAME}' criado com sucesso${NC}"
    else
        echo -e "${YELLOW}⚠️  Erro ao criar banco de dados. Pode já existir ou você precisa criar manualmente.${NC}"
    fi
else
    echo -e "${GREEN}✅ Banco de dados '${DB_NAME}' já existe${NC}"
fi

# Verificar se o usuário existe, se não, criar
echo ""
echo -e "${GREEN}🔍 Verificando usuário '${DB_USERNAME}'...${NC}"
USER_EXISTS=$(gcloud sql users list --instance="$INSTANCE_NAME_ONLY" --project="$PROJECT_ID" --format="value(name)" 2>/dev/null | grep -Fx "$DB_USERNAME" || echo "")

if [ -z "$USER_EXISTS" ]; then
    echo -e "${YELLOW}📝 Usuário '${DB_USERNAME}' não existe. Criando...${NC}"
    echo -e "${GREEN}   ℹ️  Será necessário informar a senha do usuário${NC}"
    
    # Tentar obter senha do .env primeiro
    USER_PASSWORD=""
    if [ -n "${ENV_MYSQL_PASSWORD}" ]; then
        read -p "Usar senha do .env (MYSQL_PASSWORD)? (S/n): " USE_ENV_PASSWORD
        if [ "$USE_ENV_PASSWORD" != "n" ] && [ "$USE_ENV_PASSWORD" != "N" ]; then
            USER_PASSWORD="${ENV_MYSQL_PASSWORD}"
        fi
    fi
    
    if [ -z "$USER_PASSWORD" ]; then
        read -sp "Digite a senha para o usuário '${DB_USERNAME}': " USER_PASSWORD
        echo ""
    fi
    
    if [ -n "$USER_PASSWORD" ]; then
        if gcloud sql users create "$DB_USERNAME" --instance="$INSTANCE_NAME_ONLY" --password="$USER_PASSWORD" --project="$PROJECT_ID" 2>/dev/null; then
            echo -e "${GREEN}✅ Usuário '${DB_USERNAME}' criado com sucesso${NC}"
        else
            echo -e "${YELLOW}⚠️  Erro ao criar usuário. Pode já existir ou você precisa criar manualmente.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Senha vazia. Pulando criação do usuário.${NC}"
    fi
else
    echo -e "${GREEN}✅ Usuário '${DB_USERNAME}' já existe${NC}"
fi

# Construir DB_URL para Cloud SQL
DB_URL="jdbc:mysql:///${DB_NAME}?cloudSqlInstance=${CLOUD_SQL_CONNECTION_NAME}&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false&serverTimezone=America/Sao_Paulo"

# Verificar se os secrets existem
echo ""
echo -e "${GREEN}🔐 Verificando secrets no Secret Manager...${NC}"

REQUIRED_SECRETS=("db-password" "jwt-secret" "google-client-secret" "google-client-id")
MISSING_SECRETS=()

for secret in "${REQUIRED_SECRETS[@]}"; do
    if ! gcloud secrets describe "$secret" --project="$PROJECT_ID" &> /dev/null; then
        MISSING_SECRETS+=("$secret")
        echo -e "${RED}❌ Secret '$secret' não encontrado${NC}"
    else
        echo -e "${GREEN}✅ Secret '$secret' encontrado${NC}"
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}❌ Os seguintes secrets estão faltando:${NC}"
    for secret in "${MISSING_SECRETS[@]}"; do
        echo -e "${RED}   - $secret${NC}"
    done
    echo ""
    echo -e "${YELLOW}⚠️  Crie os secrets antes de continuar.${NC}"
    echo -e "${YELLOW}   Veja a documentação em DEPLOY_CLOUD_RUN.md para instruções.${NC}"
    exit 1
fi

# Configurar permissões do Secret Manager
echo ""
echo -e "${GREEN}🔑 Configurando permissões do Secret Manager...${NC}"

for secret in "${REQUIRED_SECRETS[@]}"; do
    gcloud secrets add-iam-policy-binding "$secret" \
        --member="serviceAccount:${CLOUD_RUN_SA}" \
        --role="roles/secretmanager.secretAccessor" \
        --project="$PROJECT_ID" \
        --quiet || echo -e "${YELLOW}⚠️  Permissão já configurada para $secret (continuando...)${NC}"
done

# Obter Google Client ID do secret (para usar como variável de ambiente)
# Se não conseguir do secret, tentar do .env
GOOGLE_CLIENT_ID=$(gcloud secrets versions access latest --secret="google-client-id" --project="$PROJECT_ID" 2>/dev/null)
if [ -z "$GOOGLE_CLIENT_ID" ] && [ -n "${ENV_GOOGLE_CLIENT_ID}" ]; then
    GOOGLE_CLIENT_ID="${ENV_GOOGLE_CLIENT_ID}"
    echo -e "${YELLOW}⚠️  Usando GOOGLE_CLIENT_ID do .env (secret não encontrado)${NC}"
fi

# Imagem a ser usada
IMAGE_NAME="gcr.io/${PROJECT_ID}/planning-poker:latest"

# Verificar se a imagem existe
echo ""
echo -e "${GREEN}🔍 Verificando imagem Docker...${NC}"
if ! gcloud container images describe "$IMAGE_NAME" --project="$PROJECT_ID" &> /dev/null; then
    echo -e "${YELLOW}⚠️  Imagem não encontrada.${NC}"
    echo -e "${YELLOW}   Execute primeiro o Cloud Build ou faça build e push manualmente.${NC}"
    echo -e "${YELLOW}   Exemplo: gcloud builds submit --config=cloudbuild.yaml${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Imagem encontrada: ${IMAGE_NAME}${NC}"

# Deploy no Cloud Run
echo ""
echo -e "${BLUE}🚀 Fazendo deploy no Cloud Run...${NC}"
echo -e "${YELLOW}   Isso pode levar alguns minutos...${NC}"

gcloud run deploy planning-poker \
    --image "$IMAGE_NAME" \
    --region "$REGION" \
    --platform managed \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8080 \
    --add-cloudsql-instances "$CLOUD_SQL_CONNECTION_NAME" \
    --set-secrets="SPRING_DATASOURCE_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
    --set-env-vars="SPRING_DATASOURCE_URL=${DB_URL},SPRING_DATASOURCE_USERNAME=${DB_USERNAME},JWT_EXPIRATION=86400000,SPRING_PROFILES_ACTIVE=prod,SPRING_JPA_SHOW_SQL=false,GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}" \
    --project="$PROJECT_ID"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erro no deploy${NC}"
    exit 1
fi

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe planning-poker \
    --region "$REGION" \
    --format="value(status.url)" \
    --project="$PROJECT_ID")

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo -e "${GREEN}🌐 URL do serviço: ${SERVICE_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Informações do deploy:${NC}"
echo -e "   Projeto: ${PROJECT_ID}"
echo -e "   Região: ${REGION}"
echo -e "   Cloud SQL: ${CLOUD_SQL_CONNECTION_NAME}"
echo -e "   Banco de dados: ${DB_NAME}"
echo -e "   Usuário: ${DB_USERNAME}"
echo ""
echo -e "${YELLOW}⚠️  LEMBRE-SE:${NC}"
echo -e "${YELLOW}   - Certifique-se de que o banco de dados existe no Cloud SQL${NC}"
echo -e "${YELLOW}   - Certifique-se de que o usuário tem permissões adequadas${NC}"
echo -e "${YELLOW}   - Execute as migrações Liquibase se necessário${NC}"

