# 🚀 Guia Rápido de Deploy

## ⚠️ IMPORTANTE - Windows

**Use PowerShell, não Git Bash!**

No Windows, você deve executar o deploy usando **PowerShell** porque:
- O gcloud CLI mantém autenticação separada por shell
- O script PowerShell está completo e otimizado para Windows
- Git Bash pode não ter acesso à mesma sessão de autenticação

## 📋 Pré-requisitos

1. **Google Cloud SDK instalado**: [Instalar gcloud CLI](https://cloud.google.com/sdk/docs/install)
2. **Autenticado no gcloud**: Execute `gcloud auth login` no PowerShell
3. **Arquivo `.env` configurado** com as variáveis necessárias

## 🔧 Configurar arquivo `.env`

Crie ou edite o arquivo `.env` na raiz do projeto:

```env
# Secrets do Backend
MYSQL_PASSWORD=sua-senha-do-banco
JWT_SECRET=sua-chave-jwt-secreta-minimo-32-caracteres
GOOGLE_CLIENT_SECRET=seu-google-client-secret

# Secrets do Frontend
GOOGLE_CLIENT_ID=seu-google-client-id
```

## 🚀 Executar Deploy

### Passo 1: Abrir PowerShell

**Não use Git Bash!** Abra o PowerShell:
- Pressione `Win + X` e escolha "Windows PowerShell" ou "Terminal"
- Ou procure por "PowerShell" no menu Iniciar

### Passo 2: Navegar até o projeto

```powershell
cd D:\planning_poker
```

### Passo 3: Executar o script

```powershell
# Modo interativo (recomendado)
.\deploy-cloud-run.ps1

# Ou com parâmetros
.\deploy-cloud-run.ps1 -ProjectId "meu-projeto" -Region "us-central1" -CloudSqlInstance "minha-instancia"
```

## ✅ O que o script faz automaticamente

1. ✅ **Ativa APIs necessárias** (Cloud Build, Cloud Run, Secret Manager, etc.)
2. ✅ **Lê secrets do `.env`** e cria no Secret Manager se não existirem
3. ✅ **Configura Cloud SQL** (usa a mesma instância do projeto de referência)
4. ✅ **Cria banco de dados** `planningpoker` se não existir
5. ✅ **Cria usuário** `planningpoker_user` se não existir
6. ✅ **Configura permissões** do Cloud SQL e Secret Manager
7. ✅ **Faz o deploy** no Cloud Run

## 🔍 Verificar Autenticação

Se você receber erro de autenticação:

```powershell
# Verificar se está autenticado
gcloud auth list

# Se não estiver, fazer login
gcloud auth login

# Configurar projeto padrão (opcional)
gcloud config set project SEU_PROJECT_ID
```

## 📚 Documentação Completa

Para mais detalhes, veja: [DEPLOY_CLOUD_RUN.md](./DEPLOY_CLOUD_RUN.md)

