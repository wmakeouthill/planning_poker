# Script de deploy para Google Cloud Run (FREE TIER)
# Build LOCAL + Push para Artifact Registry + Deploy
# Configurado para Sao Paulo (southamerica-east1) com Cloud SQL
# Uso: .\deploy-cloud-run.ps1

param(
    [string]$ProjectId = "planning-poker-483523",
    [string]$Region = "southamerica-east1"
)

$ErrorActionPreference = "Continue"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# Configuracoes - Cloud SQL compartilhado com experimenta-ai
$CloudSqlConnection = "experimenta-ai-soneca-balcao:southamerica-east1:experimenta-ai-balcao"
$DbName = "planningpoker"
$DbUsername = "root"
$Registry = "southamerica-east1-docker.pkg.dev"
$RepoName = "planning-poker-repo"  # Nome do repositorio no Artifact Registry
$ImageName = "$Registry/$ProjectId/$RepoName/app"
$ImageTag = "latest"
$FullImageName = "${ImageName}:${ImageTag}"

Write-ColorOutput "========================================" "Cyan"
Write-ColorOutput "  Deploy Planning Poker - Cloud Run    " "Cyan"
Write-ColorOutput "  FREE TIER - Sao Paulo                " "Cyan"
Write-ColorOutput "  (Build Local + Push + Deploy)        " "Cyan"
Write-ColorOutput "========================================" "Cyan"
Write-Host ""

# Verificar Docker
Write-ColorOutput "[1/9] Verificando Docker..." "Yellow"
try {
    $null = Get-Command docker -ErrorAction Stop
    docker info 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "ERRO: Docker nao esta rodando" "Red"
        exit 1
    }
}
catch {
    Write-ColorOutput "ERRO: Docker nao instalado" "Red"
    exit 1
}
Write-Host "   Docker OK"

# Verificar gcloud
try {
    $null = Get-Command gcloud -ErrorAction Stop
}
catch {
    Write-ColorOutput "ERRO: gcloud CLI nao instalado" "Red"
    exit 1
}

# Configurar projeto
Write-ColorOutput "[2/9] Configurando projeto GCP..." "Yellow"
gcloud config set project $ProjectId 2>$null
gcloud auth configure-docker $Registry --quiet 2>$null

# Habilitar APIs
Write-ColorOutput "[3/9] Habilitando APIs..." "Yellow"
gcloud services enable artifactregistry.googleapis.com run.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com --project=$ProjectId 2>$null

# Criar repositorio no Artifact Registry (se nao existir)
Write-ColorOutput "[4/9] Criando repositorio no Artifact Registry..." "Yellow"
$repoExists = gcloud artifacts repositories describe $RepoName --location=$Region --project=$ProjectId 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Criando repositorio $RepoName..."
    gcloud artifacts repositories create $RepoName --repository-format=docker --location=$Region --description="Planning Poker Docker images" --project=$ProjectId 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-ColorOutput "ERRO: Falha ao criar repositorio" "Red"
        exit 1
    }
    Write-Host "   Repositorio criado!"
}
else {
    Write-Host "   Repositorio ja existe"
}

# Ler .env
Write-ColorOutput "[5/9] Lendo variaveis do .env..." "Yellow"
$envVars = @{}
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        $line = $_.Trim()
        # Ignorar linhas vazias ou comentarios
        if ($line -and -not $line.StartsWith('#')) {
            # Encontrar o primeiro '=' para separar chave do valor
            $eqIndex = $line.IndexOf('=')
            if ($eqIndex -gt 0) {
                $key = $line.Substring(0, $eqIndex).Trim()
                $value = $line.Substring($eqIndex + 1)
                
                # Remover aspas do inicio e fim, preservando conteudo interno (incluindo #)
                if (($value.StartsWith('"') -and $value.EndsWith('"')) -or 
                    ($value.StartsWith("'") -and $value.EndsWith("'"))) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
                
                $envVars[$key] = $value
            }
        }
    }
}

$GoogleClientId = $envVars["GOOGLE_CLIENT_ID"]
$GoogleClientSecret = $envVars["GOOGLE_CLIENT_SECRET"]
$JwtSecret = $envVars["JWT_SECRET"]
$DbPassword = $envVars["MYSQL_PASSWORD"]
if ($envVars["SPRING_DATASOURCE_USERNAME"]) {
    $DbUsername = $envVars["SPRING_DATASOURCE_USERNAME"]
}

if (-not $GoogleClientId -or -not $JwtSecret -or -not $DbPassword) {
    Write-ColorOutput "ERRO: Variaveis obrigatorias faltando no .env" "Red"
    Write-ColorOutput "   Necessario: GOOGLE_CLIENT_ID, JWT_SECRET, MYSQL_PASSWORD" "Red"
    exit 1
}
Write-Host "   Variaveis carregadas"

# Criar/Atualizar secrets
Write-ColorOutput "[6/9] Configurando secrets..." "Yellow"
$secrets = @{
    "db-password"          = $DbPassword
    "jwt-secret"           = $JwtSecret
    "google-client-secret" = $GoogleClientSecret
    "google-client-id"     = $GoogleClientId
}

# foreach ($secret in $secrets.GetEnumerator()) {
#     $exists = gcloud secrets describe $secret.Key --project=$ProjectId 2>$null
#     if ($LASTEXITCODE -ne 0) {
#         Write-Host "   Criando: $($secret.Key)"
#         $secret.Value | gcloud secrets create $secret.Key --data-file=- --replication-policy="automatic" --project=$ProjectId 2>$null
#     } else {
#         Write-Host "   Atualizando: $($secret.Key)"
#         $secret.Value | gcloud secrets versions add $secret.Key --data-file=- --project=$ProjectId 2>$null
#     }
# }
Write-Host "   Pulando criacao automatica de secrets (gerenciamento manual)"

# Configurar permissoes IAM
Write-ColorOutput "[7/9] Configurando permissoes IAM..." "Yellow"
$ProjectNumber = gcloud projects describe $ProjectId --format="value(projectNumber)" 2>$null
$CloudRunSA = "${ProjectNumber}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding experimenta-ai-soneca-balcao --member="serviceAccount:${CloudRunSA}" --role="roles/cloudsql.client" --quiet 2>$null
@("db-password", "jwt-secret", "google-client-secret", "google-client-id") | ForEach-Object {
    gcloud secrets add-iam-policy-binding $_ --member="serviceAccount:${CloudRunSA}" --role="roles/secretmanager.secretAccessor" --project=$ProjectId --quiet 2>$null
}
Write-Host "   Permissoes configuradas"

# Build LOCAL da imagem Docker
Write-ColorOutput "[8/9] Fazendo BUILD LOCAL da imagem Docker..." "Yellow"
Write-ColorOutput "   Isso pode levar alguns minutos..." "Cyan"

# Determinar URL da API
$NgAppApiUrl = ""
$existingService = gcloud run services describe planning-poker --region=$Region --format="value(status.url)" --project=$ProjectId 2>$null
if ($existingService) {
    $NgAppApiUrl = "$existingService/api"
}

# Build com Docker local
docker build -f Dockerfile.cloud-run --build-arg GOOGLE_CLIENT_ID=$GoogleClientId --build-arg NG_APP_API_URL=$NgAppApiUrl -t $FullImageName .

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERRO: Falha no build Docker" "Red"
    exit 1
}
Write-ColorOutput "   Build concluido!" "Green"

# Push para Artifact Registry
Write-ColorOutput "[9/9] Fazendo PUSH para Artifact Registry..." "Yellow"
docker push $FullImageName

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERRO: Falha no push" "Red"
    exit 1
}
Write-ColorOutput "   Push concluido!" "Green"

# Deploy no Cloud Run
Write-ColorOutput "[DEPLOY] Fazendo deploy no Cloud Run..." "Blue"

$DbUrl = "jdbc:mysql:///${DbName}?cloudSqlInstance=${CloudSqlConnection}&socketFactory=com.google.cloud.sql.mysql.SocketFactory&useSSL=false&serverTimezone=America/Sao_Paulo"
$envVarsStr = "SPRING_DATASOURCE_URL=$DbUrl,SPRING_DATASOURCE_USERNAME=$DbUsername,JWT_EXPIRATION=86400000,SPRING_PROFILES_ACTIVE=prod,GOOGLE_CLIENT_ID=$GoogleClientId"
$secretsStr = "SPRING_DATASOURCE_PASSWORD=db-password:latest,JWT_SECRET=jwt-secret:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest"

# FREE TIER: 512Mi memoria, 1 CPU, scale-to-zero, max 2 instancias
gcloud run deploy planning-poker `
    --image $FullImageName `
    --region $Region `
    --platform managed `
    --allow-unauthenticated `
    --memory 512Mi `
    --cpu 1 `
    --timeout 300 `
    --max-instances 2 `
    --min-instances 0 `
    --port 8080 `
    --add-cloudsql-instances $CloudSqlConnection `
    --set-secrets $secretsStr `
    --set-env-vars $envVarsStr `
    --cpu-throttling `
    --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "ERRO: Falha no deploy" "Red"
    exit 1
}

$ServiceUrl = gcloud run services describe planning-poker --region=$Region --format="value(status.url)" --project=$ProjectId 2>$null

Write-Host ""
Write-ColorOutput "========================================" "Green"
Write-ColorOutput "  DEPLOY CONCLUIDO COM SUCESSO!        " "Green"
Write-ColorOutput "========================================" "Green"
Write-Host ""
Write-ColorOutput "URL: $ServiceUrl" "Cyan"
Write-Host ""
Write-ColorOutput "Arquitetura:" "Yellow"
Write-ColorOutput "   1 container unico (backend + frontend)" "White"
Write-ColorOutput "   Backend Spring Boot serve Angular em /static/" "White"
Write-Host ""
Write-ColorOutput "Configuracoes:" "Yellow"
Write-ColorOutput "   Projeto: $ProjectId" "White"
Write-ColorOutput "   Regiao: $Region" "White"
Write-ColorOutput "   Cloud SQL: $CloudSqlConnection" "White"
Write-ColorOutput "   Banco: $DbName" "White"
Write-ColorOutput "   Usuario: $DbUsername" "White"
