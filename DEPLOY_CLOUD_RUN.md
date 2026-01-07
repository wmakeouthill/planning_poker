# 🚀 Guia de Deploy - Planning Poker no Google Cloud Run

## 📋 Resumo do Deploy do Projeto de Referência

O projeto `Experimenta_ai_soneca_delivery` foi deployado no Google Cloud Run com as seguintes características:

### Arquitetura de Deploy

1. **Cloud Build** (`cloudbuild.yaml`):
   - Build multi-stage do Docker (frontend + backend)
   - Push da imagem para Google Container Registry
   - Deploy automático no Cloud Run

2. **Cloud SQL**:
   - Conexão via Unix Socket (`/cloudsql/CONNECTION_NAME`)
   - URL JDBC: `jdbc:mysql:///DATABASE_NAME?cloudSqlInstance=CONNECTION_NAME&socketFactory=com.google.cloud.sql.mysql.SocketFactory`
   - Formato da conexão: `PROJECT_ID:REGION:INSTANCE_NAME`

3. **Secret Manager**:
   - Secrets injetados no runtime (backend)
   - Secrets injetados no build time (frontend)

## 🔐 Secrets Necessários para Planning Poker

### Secrets do Backend (Runtime)

Estes secrets são injetados no **runtime** via `--set-secrets` no Cloud Run:

| Nome do Secret | Variável de Ambiente | Descrição | Obrigatório |
|----------------|---------------------|-----------|-------------|
| `db-password` | `SPRING_DATASOURCE_PASSWORD` | Senha do usuário do banco de dados MySQL | ✅ Sim |
| `jwt-secret` | `JWT_SECRET` | Chave secreta para assinatura de tokens JWT (mínimo 32 caracteres) | ✅ Sim |
| `google-client-secret` | `GOOGLE_CLIENT_SECRET` | Client Secret do OAuth2 Google | ✅ Sim |

### Secrets do Frontend (Build Time)

Estes secrets são injetados no **build time** via `--build-arg` no Docker build:

| Nome do Secret | Variável de Ambiente | Descrição | Obrigatório |
|----------------|---------------------|-----------|-------------|
| `google-client-id` | `GOOGLE_CLIENT_ID` | Client ID do OAuth2 Google (público, mas centralizado) | ✅ Sim |

### Variáveis de Ambiente do Cloud Run

Além dos secrets, você precisa configurar estas variáveis de ambiente no Cloud Run:

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `SPRING_DATASOURCE_URL` | URL JDBC para Cloud SQL | `jdbc:mysql:///planningpoker?cloudSqlInstance=PROJECT_ID:REGION:INSTANCE&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false&serverTimezone=America/Sao_Paulo` |
| `SPRING_DATASOURCE_USERNAME` | Usuário do banco de dados | `planningpoker_user` |
| `JWT_EXPIRATION` | Tempo de expiração do JWT (ms) | `86400000` (24 horas) |
| `SPRING_PROFILES_ACTIVE` | Profile Spring Boot | `prod` |
| `SPRING_JPA_SHOW_SQL` | Mostrar SQL no log | `false` |
| `NG_APP_API_URL` | URL da API para o frontend | `https://seu-servico.run.app/api` |
| `NG_APP_GOOGLE_CLIENT_ID` | Client ID do Google (mesmo do secret) | (será injetado via build arg) |

## 📝 Comandos para Criar os Secrets

### 1. Criar Secret `db-password`

```bash
# Solicitar senha do banco
read -sp "Digite a senha do banco de dados MySQL: " DB_PASS
echo ""

# Criar secret
echo -n "$DB_PASS" | gcloud secrets create db-password \
    --data-file=- \
    --replication-policy="automatic" \
    --project="SEU_PROJECT_ID"
```

### 2. Criar Secret `jwt-secret`

```bash
# Gerar JWT secret automaticamente (recomendado)
JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)

# Criar secret
echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret \
    --data-file=- \
    --replication-policy="automatic" \
    --project="SEU_PROJECT_ID"
```

### 3. Criar Secret `google-client-secret`

```bash
# Solicitar Google Client Secret
read -sp "Digite o Google Client Secret: " GOOGLE_SECRET
echo ""

# Criar secret
echo -n "$GOOGLE_SECRET" | gcloud secrets create google-client-secret \
    --data-file=- \
    --replication-policy="automatic" \
    --project="SEU_PROJECT_ID"
```

### 4. Criar Secret `google-client-id`

```bash
# Solicitar Google Client ID
read -p "Digite o Google Client ID: " GOOGLE_CLIENT_ID

# Criar secret
echo -n "$GOOGLE_CLIENT_ID" | gcloud secrets create google-client-id \
    --data-file=- \
    --replication-policy="automatic" \
    --project="SEU_PROJECT_ID"
```

## 🔑 Configurar Permissões do Secret Manager

Após criar os secrets, configure as permissões para o Cloud Run Service Account:

```bash
# Obter número do projeto
PROJECT_NUMBER=$(gcloud projects describe "SEU_PROJECT_ID" --format="value(projectNumber)")

# Service Account do Cloud Run
CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Conceder permissões
gcloud secrets add-iam-policy-binding db-password \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="SEU_PROJECT_ID"

gcloud secrets add-iam-policy-binding jwt-secret \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="SEU_PROJECT_ID"

gcloud secrets add-iam-policy-binding google-client-secret \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="SEU_PROJECT_ID"

gcloud secrets add-iam-policy-binding google-client-id \
    --member="serviceAccount:${CLOUD_RUN_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --project="SEU_PROJECT_ID"
```

## 🗄️ Configuração do Cloud SQL

### ✅ Usar o Mesmo Cloud SQL (Recomendado)

**IMPORTANTE**: O script `deploy-cloud-run.ps1` está configurado para usar a **MESMA instância Cloud SQL** do projeto de referência (`Experimenta_ai_soneca_delivery`), mas com um **banco de dados PRÓPRIO** (`planningpoker`).

**Vantagens:**
- ✅ Economia de custos (uma instância para múltiplos projetos)
- ✅ Facilita gerenciamento
- ✅ Isolamento de dados (cada projeto tem seu próprio banco)

**O script faz automaticamente:**
- ✅ Verifica se o banco de dados `planningpoker` existe
- ✅ Cria o banco de dados se não existir
- ✅ Verifica se o usuário `planningpoker_user` existe
- ✅ Cria o usuário se não existir (solicita senha)

### Configuração Manual (se necessário)

Para usar o mesmo Cloud SQL do projeto de referência manualmente:

1. **Obter o Connection Name**:
   ```bash
   # Listar instâncias Cloud SQL
   gcloud sql instances list --project="SEU_PROJECT_ID"
   
   # O formato será: PROJECT_ID:REGION:INSTANCE_NAME
   # Exemplo: meu-projeto:us-central1:minha-instancia
   ```

2. **Criar Banco de Dados** (o script faz isso automaticamente, mas você pode fazer manualmente):
   ```bash
   gcloud sql databases create planningpoker \
       --instance="NOME_DA_INSTANCIA" \
       --project="SEU_PROJECT_ID"
   ```

3. **Criar Usuário** (o script faz isso automaticamente, mas você pode fazer manualmente):
   ```bash
   gcloud sql users create planningpoker_user \
       --instance="NOME_DA_INSTANCIA" \
       --password="SENHA_FORTE" \
       --project="SEU_PROJECT_ID"
   ```

**NOTA**: O script `deploy-cloud-run.ps1` faz isso automaticamente! Você só precisa informar o nome da instância Cloud SQL quando solicitado.

4. **Conceder Permissões do Cloud Run ao Cloud SQL**:
   ```bash
   PROJECT_NUMBER=$(gcloud projects describe "SEU_PROJECT_ID" --format="value(projectNumber)")
   CLOUD_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
   
   gcloud projects add-iam-policy-binding "SEU_PROJECT_ID" \
       --member="serviceAccount:${CLOUD_RUN_SA}" \
       --role="roles/cloudsql.client"
   ```

## 🚀 Exemplo de Deploy no Cloud Run

```bash
# Definir variáveis
PROJECT_ID="seu-projeto-id"
REGION="us-central1"
CLOUD_SQL_CONNECTION_NAME="${PROJECT_ID}:${REGION}:nome-instancia"
DB_NAME="planningpoker"
DB_USERNAME="planningpoker_user"

# Construir URL JDBC
DB_URL="jdbc:mysql:///${DB_NAME}?cloudSqlInstance=${CLOUD_SQL_CONNECTION_NAME}&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false&serverTimezone=America/Sao_Paulo"

# Deploy
gcloud run deploy planning-poker \
    --image "gcr.io/${PROJECT_ID}/planning-poker:latest" \
    --region "${REGION}" \
    --platform managed \
    --allow-unauthenticated \
    --memory 2Gi \
    --cpu 2 \
    --timeout 300 \
    --max-instances 10 \
    --min-instances 0 \
    --port 8080 \
    --add-cloudsql-instances "${CLOUD_SQL_CONNECTION_NAME}" \
    --set-secrets="SPRING_DATASOURCE_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest" \
    --set-env-vars="SPRING_DATASOURCE_URL=${DB_URL},SPRING_DATASOURCE_USERNAME=${DB_USERNAME},JWT_EXPIRATION=86400000,SPRING_PROFILES_ACTIVE=prod,SPRING_JPA_SHOW_SQL=false" \
    --project="${PROJECT_ID}"
```

## 📋 Checklist de Deploy

- [ ] Criar todos os secrets no Secret Manager (veja seção "Secrets Necessários")
- [ ] Configurar permissões do Secret Manager para Cloud Run SA
- [ ] Criar banco de dados `planningpoker` no Cloud SQL
- [ ] Criar usuário `planningpoker_user` no Cloud SQL
- [ ] Configurar permissões do Cloud SQL para Cloud Run SA
- [ ] Executar migrações Liquibase no banco de dados
- [ ] Fazer build e push da imagem Docker (ou usar Cloud Build)
- [ ] Fazer deploy no Cloud Run usando `cloudbuild.yaml` ou `gcloud run deploy`
- [ ] Testar conexão e autenticação
- [ ] Verificar se o frontend está sendo servido corretamente

## 🔐 Secrets Necessários no Secret Manager

**IMPORTANTE**: Os secrets podem ser criados de duas formas:

1. **Automaticamente** (recomendado): O script `deploy-cloud-run.ps1` lê o arquivo `.env` e cria os secrets automaticamente
2. **Manualmente**: Use os comandos abaixo para criar os secrets manualmente

### Mapeamento de Variáveis do .env para Secrets

| Variável no .env | Secret no GCP | Descrição |
|------------------|---------------|-----------|
| `MYSQL_PASSWORD` | `db-password` | Senha do banco de dados |
| `JWT_SECRET` | `jwt-secret` | Chave secreta JWT |
| `GOOGLE_CLIENT_SECRET` | `google-client-secret` | Client Secret do Google OAuth |
| `GOOGLE_CLIENT_ID` | `google-client-id` | Client ID do Google OAuth |

### Criar Secrets Manualmente (se necessário)

### Secrets do Backend (Runtime)

1. **`db-password`**
   - Variável de ambiente: `SPRING_DATASOURCE_PASSWORD`
   - Descrição: Senha do usuário do banco de dados MySQL
   - Comando para criar:
   ```bash
   read -sp "Digite a senha do banco: " DB_PASS && echo -n "$DB_PASS" | \
     gcloud secrets create db-password --data-file=- --replication-policy="automatic"
   ```

2. **`jwt-secret`**
   - Variável de ambiente: `JWT_SECRET`
   - Descrição: Chave secreta para assinatura de tokens JWT (mínimo 32 caracteres)
   - Comando para criar (gera automaticamente):
   ```bash
   JWT_SECRET=$(openssl rand -base64 32) && \
     echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- --replication-policy="automatic"
   ```

3. **`google-client-secret`**
   - Variável de ambiente: `GOOGLE_CLIENT_SECRET`
   - Descrição: Client Secret do OAuth2 Google
   - Comando para criar:
   ```bash
   read -sp "Digite o Google Client Secret: " GOOGLE_SECRET && echo -n "$GOOGLE_SECRET" | \
     gcloud secrets create google-client-secret --data-file=- --replication-policy="automatic"
   ```

### Secrets do Frontend (Build Time)

4. **`google-client-id`**
   - Variável de ambiente: `GOOGLE_CLIENT_ID` (build time)
   - Descrição: Client ID do OAuth2 Google (público, mas centralizado)
   - Comando para criar:
   ```bash
   read -p "Digite o Google Client ID: " GOOGLE_CLIENT_ID && echo -n "$GOOGLE_CLIENT_ID" | \
     gcloud secrets create google-client-id --data-file=- --replication-policy="automatic"
   ```

**NOTA**: O `cloudbuild.yaml` e `Dockerfile.cloud-run` já estão configurados para usar esses secrets. Você só precisa criá-los no Secret Manager antes de fazer o deploy.

## 🔍 Verificar Secrets Criados

```bash
# Listar todos os secrets
gcloud secrets list --project="SEU_PROJECT_ID"

# Verificar um secret específico (sem mostrar o valor)
gcloud secrets describe db-password --project="SEU_PROJECT_ID"
gcloud secrets describe jwt-secret --project="SEU_PROJECT_ID"
gcloud secrets describe google-client-secret --project="SEU_PROJECT_ID"
gcloud secrets describe google-client-id --project="SEU_PROJECT_ID"
```

## 🚀 Deploy Rápido

### ⚡ Opção Recomendada: Script Automatizado (PowerShell - Windows)

**⚠️ No Windows, use PowerShell (não Git Bash!)** O script `deploy-cloud-run.ps1` faz **tudo automaticamente**:

✅ **Ativa as APIs necessárias**  
✅ **Lê secrets do arquivo `.env` e cria automaticamente no Secret Manager**  
✅ **Configura permissões do Cloud SQL e Secret Manager**  
✅ **Faz o deploy no Cloud Run**

**Como usar:**

```powershell
# Modo interativo (solicita todas as informações)
.\deploy-cloud-run.ps1

# Com parâmetros
.\deploy-cloud-run.ps1 -ProjectId "meu-projeto" -Region "us-central1" -CloudSqlInstance "minha-instancia"

# Apenas ProjectId (resto interativo)
.\deploy-cloud-run.ps1 -ProjectId "meu-projeto"
```

**📝 Preparação do arquivo `.env`:**

Antes de executar o script, certifique-se de que seu arquivo `.env` contém as seguintes variáveis:

```env
# Secrets do Backend
MYSQL_PASSWORD=sua-senha-do-banco
JWT_SECRET=sua-chave-jwt-secreta-minimo-32-caracteres
GOOGLE_CLIENT_SECRET=seu-google-client-secret

# Secrets do Frontend
GOOGLE_CLIENT_ID=seu-google-client-id
```

O script irá:
- Ler essas variáveis do `.env`
- Criar os secrets automaticamente no Secret Manager (se não existirem)
- Usar os secrets existentes (se já existirem)

### Opção 2: Usando Cloud Build (CI/CD)

```bash
# Configurar variáveis de substituição
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_CLOUD_SQL_CONNECTION_NAME="PROJECT_ID:REGION:INSTANCE",_DB_NAME="planningpoker",_DB_USERNAME="planningpoker_user"
```

**Bash (Linux/Mac):**
```bash
# Dar permissão de execução
chmod +x deploy-cloud-run.sh

# Executar deploy
./deploy-cloud-run.sh [PROJECT_ID] [REGION] [CLOUD_SQL_INSTANCE]
```

### Opção 3: Deploy Manual

Veja a seção "Exemplo de Deploy no Cloud Run" acima.

## 📚 Arquivos de Deploy Criados

- **`Dockerfile.cloud-run`** - Multi-stage build para produção (frontend + backend)
- **`cloudbuild.yaml`** - Configuração do Cloud Build para CI/CD
- **`deploy-cloud-run.ps1`** - Script de deploy automatizado (PowerShell - Windows)
- **`deploy-cloud-run.sh`** - Script de deploy automatizado (Bash - Linux/Mac)
- **`DEPLOY_CLOUD_RUN.md`** - Esta documentação

## 📚 Referências

- Projeto de referência: `D:\Experimenta_ai_soneca_delivery`
- Arquivos importantes do projeto de referência:
  - `cloudbuild.yaml` - Configuração do Cloud Build
  - `Dockerfile.cloud-run` - Dockerfile para produção
  - `deploy-cloud-run.sh` - Script de deploy manual
  - `FRONTEND_SECRETS.md` - Documentação sobre secrets do frontend

