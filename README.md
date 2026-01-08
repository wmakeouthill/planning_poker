# 🎯 Planning Poker

Aplicação web moderna para estimativas ágeis com **Poker Planning** e **Boards colaborativos** estilo Notion.

## 📋 Índice

- [Sobre o Projeto](#sobre-o-projeto)
- [Funcionalidades](#funcionalidades)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e Execução](#instalação-e-execução)
- [Estrutura do Projeto](#estrutura-do-projeto)
- [Deploy](#deploy)
- [Documentação](#documentação)

## 🎯 Sobre o Projeto

**Planning Poker** é uma aplicação full-stack desenvolvida para facilitar estimativas ágeis em equipes de desenvolvimento. A aplicação oferece:

- **Sessões de Poker Planning** com dois modos de votação diferentes
- **Boards colaborativos** com editor de markdown estilo Notion
- **Sincronização em tempo real** via WebSocket
- **Autenticação** com JWT e suporte a login via Google OAuth2

## ✨ Funcionalidades

### 🎴 Poker Planning

A aplicação suporta **dois tipos de jogos de poker planning**:

#### 1. **Estimativa de Esforço** (`EFFORT_ESTIMATION`)

- Usa sequência Fibonacci para estimar complexidade
- Valores disponíveis: `0, ½, 1, 2, 3, 5, 8, 13, 21, ?, ☕`
- Ideal para estimar story points e esforço de desenvolvimento

#### 2. **Votação de Prioridade** (`PRIORITY_VOTING`)

- Usa escala numérica de 1 a 12 para priorizar tarefas
- Valores disponíveis: `1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, ☕`
- Ideal para definir prioridades de backlog e sprints

**Recursos das sessões:**

- Criação de sessões com código de convite único
- Participação em tempo real via WebSocket
- Revelação de votos sincronizada
- Cálculo automático de média dos votos
- Histórico de sessões anteriores
- Vinculação com Stories de Boards

### 📝 Boards com Markdown Estilo Notion

Editor de blocos rico e intuitivo, similar ao Notion, com suporte a:

#### Tipos de Blocos Suportados

- **Texto básico**: Parágrafos, títulos (H1, H2, H3)
- **Citações**: Blocos de destaque
- **Listas**:
  - Lista não ordenada (bullet list)
  - Lista ordenada (numbered list)
  - Lista de tarefas (to-do) com checkboxes
- **Código**: Blocos de código com syntax highlighting
- **Divisores**: Linhas separadoras

#### Recursos do Editor

- **Menu de comandos** (`/`) para inserir blocos rapidamente
- **Undo/Redo** completo com histórico
- **Modo de visualização** e **modo de edição**
- **Auto-save** automático
- **Syntax highlighting** para código
- **Interface responsiva** e moderna

### 🔐 Autenticação

- **Login tradicional** com email e senha
- **Login via Google OAuth2** (opcional)
- **JWT tokens** para autenticação stateless
- **Proteção de rotas** com guards no frontend

### 🔄 Sincronização em Tempo Real

- **WebSocket** para atualizações instantâneas nas sessões de poker
- **Polling** para sincronização de dados quando necessário
- **Feedback visual** de participantes conectados

## 🛠️ Tecnologias

### Backend

- **Java 21 LTS** - Linguagem principal
- **Spring Boot 3.3.7** - Framework
- **Spring Security** - Autenticação e autorização
- **Spring WebSocket** - Comunicação em tempo real
- **JPA/Hibernate** - ORM
- **MySQL 8.0** - Banco de dados
- **Liquibase** - Migrations
- **JWT** - Tokens de autenticação
- **Maven** - Gerenciamento de dependências

### Frontend

- **Angular 21** - Framework
- **TypeScript 5.9** - Linguagem
- **Tailwind CSS 4** - Estilização
- **RxJS** - Programação reativa
- **Signals** - Reatividade moderna (zoneless)
- **STOMP.js** - WebSocket client
- **Prism.js** - Syntax highlighting

### DevOps

- **Docker** & **Docker Compose** - Containerização
- **Google Cloud Run** - Deploy em produção
- **GitHub Actions** - CI/CD
- **MySQL** - Banco de dados em produção

## 🏗️ Arquitetura

O projeto segue os princípios de **Clean Architecture** e **DDD (Domain-Driven Design)**:

### Backend

```
backend/
├── dominio/          # Entidades, enums, repositórios (camada de domínio)
├── aplicacao/        # Serviços de aplicação (casos de uso)
├── infraestrutura/   # Implementações técnicas (JPA, Security, etc.)
└── interfaces/       # Controllers REST e APIs
```

### Frontend

```
frontend/
├── features/         # Módulos por funcionalidade
│   ├── auth/        # Autenticação
│   ├── boards/      # Boards e editor
│   └── poker/       # Sessões de poker
├── core/            # Guards, interceptors, utils
└── shared/          # Componentes compartilhados
```

## 📦 Pré-requisitos

- **Java 21** ou superior
- **Node.js 22 LTS** ou superior
- **Maven 3.8+**
- **Docker** e **Docker Compose** (opcional, mas recomendado)
- **MySQL 8.0** (se não usar Docker)

## 🚀 Instalação e Execução

### Opção 1: Docker Compose (Recomendado)

1. **Clone o repositório:**

```bash
git clone <repository-url>
cd planning_poker
```

1. **Configure as variáveis de ambiente:**
Crie um arquivo `.env` na raiz do projeto:

```env
MYSQL_DATABASE=planningpoker
MYSQL_USER=planningpoker
MYSQL_PASSWORD=sua_senha_aqui
MYSQL_ROOT_PASSWORD=senha_root_aqui
JWT_SECRET=seu_jwt_secret_aqui
JWT_EXPIRATION=86400000
GOOGLE_CLIENT_ID=seu_google_client_id (opcional)
GOOGLE_CLIENT_SECRET=seu_google_client_secret (opcional)
NG_APP_API_URL=http://localhost:8080/api
NG_APP_GOOGLE_CLIENT_ID=seu_google_client_id (opcional)
```

1. **Execute com Docker Compose:**

```bash
docker-compose up -d
```

1. **Acesse a aplicação:**

- Frontend: <http://localhost:4200>
- Backend API: <http://localhost:8080/api>
- Swagger/OpenAPI: <http://localhost:8080/swagger-ui.html>
- phpMyAdmin (opcional): <http://localhost:8081> (use `--profile tools`)

### Opção 2: Execução Local

#### Backend

1. **Configure o banco de dados MySQL:**

```sql
CREATE DATABASE planningpoker;
```

1. **Configure `application.yml`:**

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/planningpoker
    username: seu_usuario
    password: sua_senha
```

1. **Execute o backend:**

```bash
cd backend
mvn spring-boot:run
```

#### Frontend

1. **Instale as dependências:**

```bash
cd frontend
npm install
```

1. **Configure as variáveis de ambiente:**
Crie `frontend/public/assets/env.js`:

```javascript
window['env'] = {
  API_URL: 'http://localhost:8080/api',
  GOOGLE_CLIENT_ID: 'seu_google_client_id' // opcional
};
```

1. **Execute o frontend:**

```bash
npm start
```

1. **Acesse:** <http://localhost:4200>

## 📁 Estrutura do Projeto

```
planning_poker/
├── backend/                 # API Spring Boot
│   ├── src/main/java/      # Código fonte Java
│   ├── src/main/resources/ # Configurações e migrations
│   └── pom.xml             # Dependências Maven
├── frontend/                # Aplicação Angular
│   ├── src/                # Código fonte TypeScript
│   ├── public/             # Assets estáticos
│   └── package.json        # Dependências npm
├── docker-compose.yml       # Configuração Docker
├── Dockerfile.cloud-run     # Dockerfile para produção
├── regras-desenvolvimento/ # Documentação de regras
└── README.md               # Este arquivo
```

## 🚢 Deploy

### Google Cloud Run

O projeto inclui scripts e configurações para deploy no Google Cloud Run:

- **Scripts de deploy:**
  - `deploy-cloud-run.sh` (Linux/Mac)
  - `deploy-cloud-run.ps1` (Windows)
  
- **Documentação:** Veja `DEPLOY_CLOUD_RUN.md`

### GitHub Pages

Para deploy do frontend no GitHub Pages:

- **Script:** `deploy-github-pages.ps1`
- **Documentação:** Veja `DEPLOY_GITHUB_PAGES.md`

## 📚 Documentação

### Regras de Desenvolvimento

O projeto segue padrões rigorosos de desenvolvimento documentados em:

- **`regras-desenvolvimento/rules.md`** - Índice geral
- **`regras-desenvolvimento/regras-backend.md`** - Padrões backend
- **`regras-desenvolvimento/regras-frontend.md`** - Padrões frontend

### API Documentation

A documentação da API está disponível via **Swagger/OpenAPI**:

- Local: <http://localhost:8080/swagger-ui.html>
- Produção: `{API_URL}/swagger-ui.html`

## 🎮 Como Usar

### Criando um Board

1. Faça login na aplicação
2. Acesse a página de Boards
3. Clique em "Novo Board"
4. Digite `/` para ver os comandos disponíveis
5. Comece a escrever e formatar seu conteúdo

### Criando uma Sessão de Poker

1. Acesse a página de Poker
2. Clique em "Nova Sessão"
3. Escolha o modo:
   - **Estimativa de Esforço** (Fibonacci)
   - **Votação de Prioridade** (1-12)
4. Opcionalmente, vincule uma Story de um Board
5. Compartilhe o código de convite com os participantes
6. Inicie a votação e revele os resultados quando todos votarem

## 🤝 Contribuindo

Este projeto segue padrões de Clean Architecture e Clean Code. Antes de contribuir, leia:

- `regras-desenvolvimento/rules.md`
- `regras-desenvolvimento/regras-backend.md`
- `regras-desenvolvimento/regras-frontend.md`

## 📄 Licença

[Adicione informações de licença aqui]

---

**Desenvolvido com ❤️ para facilitar estimativas ágeis**
