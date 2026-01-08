# 🚀 Deploy do Frontend no GitHub Pages

Este guia explica como fazer o deploy do frontend no GitHub Pages e conectá-lo ao backend no Cloud Run.

## 📋 Pré-requisitos

1. ✅ Backend deployado no Cloud Run (ex: `https://seu-backend.run.app`)
2. ✅ CORS configurado no backend para aceitar requisições do GitHub Pages
3. ✅ Repositório GitHub configurado

## 🔧 Configuração Inicial

### 1. Habilitar GitHub Pages no Repositório

1. Vá em **Settings** > **Pages** do seu repositório
2. Configure:
   - **Source**: `GitHub Actions`
   - **Branch**: `gh-pages` (será criado automaticamente pelo workflow)

### 2. Configurar URL do Backend

Você precisa configurar a URL do backend no arquivo `frontend/public/assets/env.js`:

**Opção 1: Editar manualmente antes do build**

Edite o arquivo `frontend/public/assets/env.js` e substitua:
```javascript
var backendUrl = window.__BACKEND_URL__ || 'https://SEU-BACKEND.run.app';
```

Por:
```javascript
var backendUrl = window.__BACKEND_URL__ || 'https://seu-backend.run.app';
```

**Opção 2: Usar o script PowerShell (recomendado)**

```powershell
.\deploy-github-pages.ps1 -BackendUrl "https://seu-backend.run.app"
```

**Opção 3: Usar GitHub Actions (automático)**

O workflow `.github/workflows/deploy-github-pages.yml` já está configurado. Você só precisa fornecer a URL do backend ao executar o workflow manualmente.

## 🚀 Deploy Manual

### Usando PowerShell (Windows)

```powershell
# Execute na raiz do projeto
.\deploy-github-pages.ps1 -BackendUrl "https://seu-backend.run.app"
```

O script irá:
1. ✅ Instalar dependências
2. ✅ Configurar a URL do backend
3. ✅ Fazer build para GitHub Pages
4. ✅ Copiar 404.html para dist

Após o build, você precisa fazer commit e push:

```bash
cd frontend/dist/frontend/browser
git init
git add .
git commit -m "Deploy frontend no GitHub Pages"
git branch -M gh-pages
git remote add origin https://github.com/seu-usuario/planning_poker.git
git push -u origin gh-pages
```

### Usando npm diretamente

```bash
cd frontend

# Editar env.js manualmente com a URL do backend
# Editar: public/assets/env.js

# Instalar dependências
npm install

# Build para GitHub Pages
npm run build -- --configuration=github-pages

# Copiar 404.html
cp public/404.html dist/frontend/browser/404.html
```

## 🤖 Deploy Automático (GitHub Actions)

O repositório já inclui um workflow GitHub Actions (`.github/workflows/deploy-github-pages.yml`) que faz o deploy automaticamente quando você faz push no branch `main`.

### Configurar URL do Backend no Workflow

**Opção 1: Editar o workflow diretamente**

Edite `.github/workflows/deploy-github-pages.yml` e altere a linha:
```yaml
default: 'https://seu-backend.run.app'
```

**Opção 2: Usar inputs do workflow**

Quando executar o workflow manualmente, você pode fornecer a URL do backend como input.

### Habilitar GitHub Actions

1. Vá em **Settings** > **Actions** > **General**
2. Ative **Workflow permissions**:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### Executar Deploy

O workflow executa automaticamente quando você faz push em `frontend/**` no branch `main`.

Para executar manualmente:
1. Vá em **Actions** > **Deploy Frontend to GitHub Pages**
2. Clique em **Run workflow**
3. Informe a URL do backend
4. Clique em **Run workflow**

## 🔐 Configuração de CORS

O backend já está configurado para aceitar requisições de qualquer domínio HTTPS (`https://*`), então o GitHub Pages funcionará automaticamente.

**Verificação**: O arquivo `backend/src/main/java/com/planningpoker/infraestrutura/security/SecurityConfig.java` já contém:
```java
restConfiguration.setAllowedOriginPatterns(List.of(
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*")); // ✅ Aceita GitHub Pages
```

## 📁 Estrutura de Arquivos

Após o build, a estrutura será:
```
frontend/
  dist/
    frontend/
      browser/
        index.html          # App Angular
        404.html            # Redirecionamento para SPA
        assets/
          env.js            # Configuração com URL do backend
        main.*.js           # Bundle principal
        styles.*.css        # Estilos
        ...                 # Outros assets
```

## 🌐 URL do GitHub Pages

A URL do seu frontend será:
```
https://seu-usuario.github.io/planning_poker/
```

**Nota**: O `baseHref` está configurado como `/planning_poker/` no `angular.json`. Se seu repositório tiver outro nome, ajuste:

1. Edite `angular.json` na configuração `github-pages`
2. Altere `"baseHref": "/planning_poker/"` para `"baseHref": "/seu-repo-name/"`

## ✅ Verificação

Após o deploy, verifique:

1. ✅ O frontend carrega em `https://seu-usuario.github.io/planning_poker/`
2. ✅ As rotas do Angular funcionam (não retornam 404)
3. ✅ O frontend consegue fazer requisições para o backend
4. ✅ O login funciona corretamente
5. ✅ O console do navegador não mostra erros de CORS

### Testar Conexão com Backend

Abra o console do navegador (F12) e verifique:
- ✅ Não há erros de CORS
- ✅ As requisições para `/api/*` estão indo para o backend Cloud Run correto
- ✅ Não há erros 404 nas requisições da API

## 🐛 Troubleshooting

### Erro 404 nas rotas do Angular

**Problema**: Ao acessar rotas como `/boards`, retorna 404.

**Solução**: Verifique se o arquivo `404.html` está na pasta `dist/frontend/browser/`.

### Erro de CORS

**Problema**: Console mostra erro de CORS ao fazer requisições.

**Solução**: 
1. Verifique se a URL do backend está correta no `env.js`
2. Verifique se o backend permite requisições do GitHub Pages (já configurado por padrão)

### Build falha

**Problema**: O build não completa.

**Solução**:
1. Limpe o cache: `npm cache clean --force`
2. Delete `node_modules` e `dist`: `rm -rf node_modules dist`
3. Reinstale: `npm install`
4. Tente novamente: `npm run build -- --configuration=github-pages`

### URLs incorretas dos assets

**Problema**: Imagens e CSS não carregam.

**Solução**: Verifique se o `baseHref` no `angular.json` corresponde ao nome do seu repositório.

## 📝 Checklist de Deploy

- [ ] Backend deployado no Cloud Run
- [ ] URL do backend configurada no `env.js`
- [ ] GitHub Pages habilitado no repositório
- [ ] GitHub Actions configurado (se usando deploy automático)
- [ ] Build testado localmente
- [ ] Deploy realizado
- [ ] Frontend acessível em `https://seu-usuario.github.io/planning_poker/`
- [ ] Rotas do Angular funcionando
- [ ] Conexão com backend funcionando
- [ ] Login testado e funcionando

## 🔄 Atualizar Deploy

Para atualizar o frontend no GitHub Pages:

**Deploy Automático (GitHub Actions)**:
- Simplesmente faça push no branch `main`
- O workflow executará automaticamente

**Deploy Manual**:
1. Execute `.\deploy-github-pages.ps1 -BackendUrl "https://seu-backend.run.app"`
2. Faça commit e push da pasta `dist/frontend/browser` para a branch `gh-pages`

## 📚 Referências

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Angular Deployment Guide](https://angular.io/guide/deployment)
- [GitHub Actions for Pages](https://github.com/actions/deploy-pages)
