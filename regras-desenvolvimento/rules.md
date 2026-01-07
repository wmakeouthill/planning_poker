# Protocolo de Desenvolvimento - Sistema SELIC

Este documento serve como índice para as regras e padrões de desenvolvimento do ecossistema SELIC.

---

## Documentação de Regras

O protocolo de desenvolvimento está dividido em documentos especializados:

### 📋 [Regras Backend](./regras-backend.md)

Padrões para desenvolvimento de microsserviços Java/Spring Boot:

- **Clean Architecture** - Estrutura de camadas e regra de dependência
- **Estrutura de Pacotes DDD** - dominio/aplicacao/infraestrutura/interfaces
- **Stack Tecnológica** - Java 21 LTS (versão estável com Virtual Threads), Spring Boot 3.x, banco conforme produto (ex.: Oracle)
- **Padrões de Código** - Entidades, DTOs, Serviços, Repositórios
- **APIs REST** - Interface + Controller, OpenAPI, Feign Clients
- **Segurança OWASP** - Top 10 vulnerabilidades e mitigações
- **Segurança RBAC** - Controle de acesso baseado em roles com Spring Security
- **Autenticação** - OAuth2/JWT, RHSSO, Jasypt
- **Banco de Dados** - Liquibase, nomenclatura de tabelas
- **Testes** - JUnit 5, Mockito, ArchUnit
- **CI/CD** - Jenkins, ambientes, OpenShift

### 📋 [Regras Frontend](./regras-frontend.md)

Padrões para desenvolvimento de aplicações Angular:

- **Clean Architecture** - Adaptação para frontend Angular
- **Estrutura de Módulos** - pages/services/models/shared
- **Stack Tecnológica** - Angular (>= 20 zoneless), TypeScript (>= 5.6), Node.js (22 LTS)
- **Standalone Components** - Componentes independentes como padrão
- **Signals** - Reatividade moderna com Signals
- **Bibliotecas Internas** - selic-ng-page, selic-ng-form, etc.
- **Padrões de Código** - Components, Services, Pipes, Interceptors
- **Segurança OWASP** - XSS, CSRF, Content Security Policy
- **Segurança RBAC** - Guards e Interceptors para controle de acesso
- **Módulos** - Feature modules, lazy loading, SharedModule
- **Configurações** - Proxy, TypeScript, integração Maven

### 📋 [Regras Projeto Mobile Híbrido](./regras-projeto-mobile.md)

Padrões para desenvolvimento de aplicações híbridas Android/iOS:

- **Stack Híbrida** - Angular + Ionic Framework + Capacitor
- **Comunicação Backend** - CORS para Cloud Run, APIs RESTful
- **Autenticação JWT** - Stateless, armazenamento seguro
- **APIs Nativas** - Camera, Haptics, Geolocation, Push Notifications
- **Build e Deploy** - Fluxo para App Store e Play Store

---

## Princípios Gerais

Ambos os documentos seguem os princípios fundamentais:

### Clean Code

- Métodos/componentes pequenos e focados
- Nomes descritivos e auto-explicativos
- Código legível sem necessidade de comentários

### Clean Architecture

- Separação clara de responsabilidades
- Dependências apontam para o centro (domínio)
- Independência de frameworks externos

### DRY (Don't Repeat Yourself)

- Reutilização de código via bibliotecas comuns
- Componentes/serviços compartilhados
- Centralização de configurações

### SOLID

- **S**ingle Responsibility
- **O**pen/Closed
- **L**iskov Substitution
- **I**nterface Segregation
- **D**ependency Inversion

### OWASP Top 10

Princípios de segurança de aplicação seguindo o [OWASP Top 10](https://owasp.org/Top10/):

- **A01** - Broken Access Control (Controle de Acesso Quebrado)
- **A02** - Cryptographic Failures (Falhas Criptográficas)
- **A03** - Injection (Injeção SQL, LDAP, etc.)
- **A04** - Insecure Design (Design Inseguro)
- **A05** - Security Misconfiguration (Configuração Incorreta de Segurança)
- **A06** - Vulnerable Components (Componentes Vulneráveis)
- **A07** - Authentication Failures (Falhas de Autenticação)
- **A08** - Data Integrity Failures (Falhas de Integridade de Dados)
- **A09** - Logging Failures (Falhas de Logging e Monitoramento)
- **A10** - SSRF (Server-Side Request Forgery)

> Veja detalhes de implementação em [regras-backend.md](./regras-backend.md#13-owasp-top-10) e [regras-frontend.md](./regras-frontend.md#9-segurança-owasp)

### RBAC (Role-Based Access Control)

Controle de acesso baseado em papéis:

- **Roles** - Papéis definidos no RHSSO/Keycloak
- **Permissions** - Permissões granulares por funcionalidade
- **Hierarquia** - Papéis herdando de outros papéis
- **Auditing** - Log de todas as ações de acesso

> Veja detalhes de implementação em [regras-backend.md](./regras-backend.md#14-rbac) e [regras-frontend.md](./regras-frontend.md#10-segurança-rbac)

---

## Quick Reference

| Aspecto | Backend | Frontend | Mobile Híbrido |
|---------|---------|----------|----------------|
| Linguagem | Java 21 LTS | TypeScript >= 5.6 | TypeScript >= 5.6 |
| Framework | Spring Boot 3.x | Angular >= 20 (zoneless) | Angular >= 20 + Ionic 8.x |
| Arquitetura | DDD + Clean Architecture | Organização por feature + Clean Architecture (standalone por padrão) | Feature modules + Capacitor |
| Camadas | dominio/aplicacao/infraestrutura/interfaces | models/services/pages/shared | models/services/pages/shared + native |
| Segurança | OWASP + RBAC + OAuth2/JWT | OWASP + RBAC + Guards | JWT Stateless + Secure Storage |
| Testes | JUnit 5 + Mockito + ArchUnit | Jasmine + Karma | Jasmine + Capacitor Test |
| Build | Maven | NPM + frontend-maven-plugin | Ionic CLI + Capacitor |
| CI/CD | Jenkins + selic-pipeline | Integrado ao Maven | App Store / Play Store |
| Deploy | OpenShift | Integrado ao Backend | Cloud Run + App Stores |
