# Regras de Desenvolvimento Frontend - Sistema SELIC

Este documento estabelece as regras, princípios e padrões para o desenvolvimento frontend das aplicações do ecossistema SELIC.

---

## 1. Clean Architecture no Frontend

### 1.1 Princípios

A arquitetura frontend segue uma adaptação da Clean Architecture para Angular:

- **Separação por Feature**: Cada funcionalidade em seu próprio módulo
- **Independência de UI Components**: Componentes reutilizáveis isolados
- **Serviços como Camada de Dados**: Abstração para comunicação com backend
- **Models como Domínio**: Tipos e interfaces representam entidades do negócio

### 1.2 Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                          PAGES                                   │
│  (Componentes de Página / Smart Components)                     │
│  - Coordena fluxo da tela                                       │
│  - Injeta serviços                                              │
│  - Gerencia estado da página                                    │
├─────────────────────────────────────────────────────────────────┤
│                        SERVICES                                  │
│  (Serviços HTTP / Casos de Uso)                                 │
│  - Comunicação com backend                                      │
│  - Transformação de dados                                       │
│  - Lógica de orquestração                                       │
├─────────────────────────────────────────────────────────────────┤
│                         MODELS                                   │
│  (Interfaces / Classes TypeScript)                              │
│  - Representação do domínio                                     │
│  - Tipagem forte                                                │
│  - Contratos de dados                                           │
├─────────────────────────────────────────────────────────────────┤
│                    SHARED (Infraestrutura)                       │
│  (Components, Pipes, Directives, Interceptors)                  │
│  - Componentes reutilizáveis                                    │
│  - Pipes de formatação                                          │
│  - Diretivas customizadas                                       │
│  - Interceptors HTTP                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Estrutura de Diretórios

```
frontend/
├── src/
│   ├── app/
│   │   ├── modules/
│   │   │   ├── {feature}/                  # Módulo de Feature
│   │   │   │   ├── pages/                  # Componentes de Página
│   │   │   │   │   └── {page}/
│   │   │   │   │       ├── {page}.component.ts
│   │   │   │   │       ├── {page}.component.html
│   │   │   │   │       └── {page}.component.scss
│   │   │   │   ├── services/               # Serviços HTTP
│   │   │   │   │   └── {feature}.service.ts
│   │   │   │   ├── models/                 # Interfaces/Classes
│   │   │   │   │   └── {entity}.ts
│   │   │   │   ├── {feature}.module.ts
│   │   │   │   └── {feature}.routing.module.ts
│   │   │   │
│   │   │   └── shared/                     # Módulo Compartilhado
│   │   │       ├── components/             # Componentes reutilizáveis
│   │   │       ├── directives/             # Diretivas customizadas
│   │   │       ├── interceptors/           # HTTP interceptors
│   │   │       ├── pipes/                  # Pipes de formatação
│   │   │       ├── models/                 # Models compartilhados
│   │   │       ├── services/               # Serviços base
│   │   │       │   └── abstract-http.service.ts
│   │   │       └── shared.module.ts
│   │   │
│   │   ├── app.module.ts
│   │   └── app.routing.module.ts
│   │
│   ├── assets/                             # Recursos estáticos
│   └── environments/                       # Configurações de ambiente
│
├── angular.json
├── package.json
├── proxy.config.js
└── tsconfig.json
```

### 1.4 Regra de Dependência

```
pages → services → models ← shared
```

- **pages** pode importar de: `services`, `models`, `shared`
- **services** pode importar de: `models`, `shared`
- **models** são independentes
- **shared** pode importar de: `models`

### 1.5 Exemplo Real: Módulo Operação

**Model (Domínio):**
```typescript
// modules/operacao/models/operacao.ts
export class Operacao {
    id: string;
    codigoOperacao: string;
    numeroOperacao: string;
    participanteCedente: string;
    dataOperacao: string;
    contaCedente: string;
    participanteCessionario: string;
    contaCessionario: string;
    codigoTitulo: string;
    dataVencimentoTitulo: string;
    precoUnitario: string;
    quantidadeTitulos: string;
    valorFinanceiro: string;
    dataInclusao: string;
    situacao: string;
}
```

```typescript
// modules/operacao/models/filtro-operacao.ts
export class FiltroOperacao {
    numeroOperacao?: string;
    codigoOperacao?: string;
    dataMovimento?: string;
    situacao?: string;
    totalRegistros?: number;
}
```

**Service (Caso de Uso):**
```typescript
// modules/operacao/services/operacao.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AbstractHttpService } from '../../shared/services/abstract-http.service';
import { Operacao } from '../models/operacao';
import { FiltroOperacao } from '../models/filtro-operacao';
import { ResultadoPaginado } from '../../shared/models/resultado-paginado';

@Injectable({ providedIn: 'root' })
export class OperacaoService extends AbstractHttpService {

    constructor(httpClient: HttpClient) {
        super(httpClient);
    }

    pesquisar(filtro: FiltroOperacao, page: number): Observable<ResultadoPaginado<Operacao>> {
        const url = `${this.URL_ROOT}/v1/operacao`;
        return this.httpClient.get<ResultadoPaginado<Operacao>>(url, {
            params: { ...filtro, page: page.toString() }
        });
    }

    detalhe(id: number): Observable<Operacao> {
        const url = `${this.URL_ROOT}/v1/operacao/${id}`;
        return this.httpClient.get<Operacao>(url);
    }

    historico(id: number): Observable<ResultadoPaginado<Operacao>> {
        const url = `${this.URL_ROOT}/v1/operacao/${id}/historico`;
        return this.httpClient.get<ResultadoPaginado<Operacao>>(url);
    }
}
```

**Page (Smart Component):**
```typescript
// modules/operacao/pages/consulta-operacao/consulta-operacao.component.ts
import { Component, OnInit, Inject } from '@angular/core';
import { SelicSPA, SELIC_SPA } from 'selic-ng-page';
import { Router } from '@angular/router';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Operacao } from '../../models/operacao';
import { FiltroOperacao } from '../../models/filtro-operacao';
import { OperacaoService } from '../../services/operacao.service';
import { ResultadoPaginado } from '../../../shared/models/resultado-paginado';
import { EventoPaginacao } from '../../../shared/components/bootstrap-pagination/bootstrap-pagination.component';

@Component({
    selector: 'selic-consulta-operacao',
    templateUrl: './consulta-operacao.component.html',
    styleUrls: ['./consulta-operacao.component.scss'],
    providers: [
        { provide: SELIC_SPA, useClass: ConsultaOperacaoComponent, multi: false }
    ]
})
export class ConsultaOperacaoComponent extends SelicSPA implements OnInit {

    resultadoOperacao: ResultadoPaginado<Operacao>;
    detalheOperacao$: Observable<Operacao>;
    filtroAtual: FiltroOperacao;

    constructor(
        private operacaoService: OperacaoService,
        private router: Router,
        @Inject(HTTP_INTERCEPTORS) private baseHttpInterceptors: Array<any>
    ) {
        super(baseHttpInterceptors, router);
    }

    ngOnInit(): void {}

    consultar(filtro: FiltroOperacao, page: number): void {
        this.filtroAtual = filtro;
        this.resultadoOperacao = undefined;

        this.operacaoService.pesquisar(filtro, page).subscribe(resultado => {
            this.resultadoOperacao = resultado;
            this.filtroAtual.totalRegistros = resultado.quantidadeRegistros;
        });
    }

    paginar(evento: EventoPaginacao): void {
        this.filtroAtual.totalRegistros = evento.totalRegistros;
        this.consultar(this.filtroAtual, evento.pagina);
    }

    detalhar(id: number): void {
        this.detalheOperacao$ = this.operacaoService.detalhe(id);
    }
}
```

**Base Service (Infraestrutura Compartilhada):**
```typescript
// modules/shared/services/abstract-http.service.ts
import { HttpClient } from '@angular/common/http';

export abstract class AbstractHttpService {
    protected URL_ROOT = '/selic-painel-surem/rest';
    protected httpClient: HttpClient;

    constructor(httpClient: HttpClient) {
        this.httpClient = httpClient;
    }
}
```

---

## 2. Stack Tecnológica

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Angular | >= 20 (zoneless) | Framework SPA |
| TypeScript | >= 5.6 | Linguagem principal |
| Node.js | 22 LTS | Runtime de desenvolvimento |
| NPM | >= 10 | Gerenciador de pacotes |
| Tailwind CSS | 4.x | Framework CSS utility-first |
| RxJS | >= 7.8 | Programação reativa |
| Angular Signals | built-in | Reatividade moderna |

### 2.1 Bibliotecas Internas SELIC (NPM)

Componentes padronizados publicados no Nexus interno:

```json
{
    "selic-ng-page": "^1.7.3",
    "selic-ng-form": "1.11.0",
    "selic-ng-nav-bar": "^1.7.3",
    "selic-ng-button": "^1.7.3",
    "selic-ng-message": "^1.7.3",
    "selic-ng-loader": "^1.7.3",
    "selic-angular-network": "^1.7.3",
    "selic-theme": "^1.0.10"
}
```

### 2.2 Configuração NPM

**.npmrc:**
```
registry=https://nexus.selic.bc/nexus/repository/npm-public/
```

---

## 2A. Angular 20+ - Features Modernas

### 2A.1 Standalone Components (Padrão)

A partir do Angular 20, **Standalone Components** são o padrão. Módulos são opcionais.

```typescript
// ✅ PADRÃO: Standalone Component
@Component({
    selector: 'selic-consulta-operacao',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        BootstrapPaginationComponent,
        ContaSelicPipe
    ],
    templateUrl: './consulta-operacao.component.html',
    styleUrl: './consulta-operacao.component.scss'
})
export class ConsultaOperacaoComponent {
    // ...
}

// ✅ Lazy loading com standalone
export const routes: Routes = [
    {
        path: 'operacao',
        loadComponent: () => import('./pages/consulta-operacao/consulta-operacao.component')
            .then(m => m.ConsultaOperacaoComponent)
    }
];
```

### 2A.2 Zoneless Change Detection

O projeto utiliza **Zoneless** para melhor performance:

```typescript
// main.ts
import { bootstrapApplication } from '@angular/platform-browser';
import { provideExperimentalZonelessChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
    providers: [
        provideExperimentalZonelessChangeDetection(), // Sem Zone.js
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor]))
    ]
});
```

**Regras para Zoneless:**
- Usar `signal()` para estado reativo
- Usar `ChangeDetectorRef.markForCheck()` quando necessário
- Evitar mutação direta de objetos

### 2A.3 Signals (Reatividade Moderna)

```typescript
import { Component, signal, computed, effect } from '@angular/core';

@Component({
    selector: 'selic-filtro-operacao',
    standalone: true,
    template: `
        <input [value]="filtro()" (input)="filtro.set($event.target.value)">
        <span>Total: {{ totalResultados() }}</span>
    `
})
export class FiltroOperacaoComponent {
    // Signal para estado
    filtro = signal<string>('');
    resultados = signal<Operacao[]>([]);
    
    // Computed para valores derivados
    totalResultados = computed(() => this.resultados().length);
    
    // Effect para side effects
    constructor() {
        effect(() => {
            console.log('Filtro alterado:', this.filtro());
        });
    }
    
    atualizarResultados(dados: Operacao[]) {
        this.resultados.set(dados); // Dispara reatividade
    }
}
```

**Quando usar Signals vs RxJS:**

| Cenário | Usar |
|---------|------|
| Estado local do componente | `signal()` |
| Valores derivados | `computed()` |
| Side effects reativos | `effect()` |
| Streams assíncronos (HTTP, WebSocket) | `Observable` |
| Operadores complexos (debounce, merge) | `Observable` |

### 2A.4 Functional Guards e Resolvers

```typescript
// ✅ Functional Guard (Angular 20+)
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (authService.isAuthenticated()) {
        return true;
    }
    
    return router.createUrlTree(['/login']);
};

// ✅ Functional Resolver
export const operacaoResolver: ResolveFn<Operacao> = (route) => {
    const service = inject(OperacaoService);
    const id = route.paramMap.get('id')!;
    return service.buscarPorId(+id);
};

// Uso nas rotas
export const routes: Routes = [
    {
        path: 'operacao/:id',
        loadComponent: () => import('./detalhe-operacao.component'),
        canActivate: [authGuard],
        resolve: { operacao: operacaoResolver }
    }
];
```

### 2A.5 DestroyRef para Cleanup

```typescript
import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'selic-consulta',
    standalone: true
})
export class ConsultaComponent {
    private destroyRef = inject(DestroyRef);
    
    consultar() {
        this.operacaoService.pesquisar()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(dados => this.dados.set(dados));
    }
}
```

### 2A.6 Functional Interceptors

```typescript
// ✅ Functional HTTP Interceptor
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const token = authService.getToken();
    
    if (token) {
        req = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` }
        });
    }
    
    return next(req);
};

// Registro no bootstrap
bootstrapApplication(AppComponent, {
    providers: [
        provideHttpClient(
            withInterceptors([authInterceptor, loggingInterceptor])
        )
    ]
});
```

---

## 3. Padrões de Código

### 3.1 Componentes

**Smart Component (Page):**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'selic-nome-pagina',
    templateUrl: './nome-pagina.component.html',
    styleUrls: ['./nome-pagina.component.scss']
})
export class NomePaginaComponent implements OnInit, OnDestroy {

    private destroy$ = new Subject<void>();

    dados: TipoDados[];

    constructor(private servico: MeuServico) {}

    ngOnInit(): void {
        this.carregarDados();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    private carregarDados(): void {
        this.servico.listar()
            .pipe(takeUntil(this.destroy$))
            .subscribe(dados => this.dados = dados);
    }
}
```

**Dumb Component (Shared):**
```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'selic-bootstrap-modal',
    templateUrl: './bootstrap-modal.component.html'
})
export class BootstrapModalComponent {

    @Input() titulo: string;
    @Input() tamanho: 'sm' | 'md' | 'lg' | 'xl' = 'md';

    @Output() confirmar = new EventEmitter<void>();
    @Output() cancelar = new EventEmitter<void>();

    onConfirmar(): void {
        this.confirmar.emit();
    }

    onCancelar(): void {
        this.cancelar.emit();
    }
}
```

### 3.2 Serviços HTTP

```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AbstractHttpService } from '../shared/services/abstract-http.service';

@Injectable({ providedIn: 'root' })
export class MeuService extends AbstractHttpService {

    constructor(httpClient: HttpClient) {
        super(httpClient);
    }

    listar(): Observable<Entidade[]> {
        const url = `${this.URL_ROOT}/v1/recurso`;
        return this.httpClient.get<Entidade[]>(url);
    }

    buscarPorId(id: number): Observable<Entidade> {
        const url = `${this.URL_ROOT}/v1/recurso/${id}`;
        return this.httpClient.get<Entidade>(url);
    }

    salvar(entidade: Entidade): Observable<Entidade> {
        const url = `${this.URL_ROOT}/v1/recurso`;
        return this.httpClient.post<Entidade>(url, entidade);
    }

    atualizar(id: number, entidade: Entidade): Observable<Entidade> {
        const url = `${this.URL_ROOT}/v1/recurso/${id}`;
        return this.httpClient.put<Entidade>(url, entidade);
    }

    excluir(id: number): Observable<void> {
        const url = `${this.URL_ROOT}/v1/recurso/${id}`;
        return this.httpClient.delete<void>(url);
    }
}
```

### 3.3 HTTP Interceptor

```typescript
import { Injectable } from '@angular/core';
import {
    HttpInterceptor, HttpRequest, HttpHandler,
    HttpEvent, HttpHeaders
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class HttpsRequestInterceptor implements HttpInterceptor {

    private httpOptions = {
        headers: new HttpHeaders({
            'Content-Type': 'application/json; charset=UTF-8'
        })
    };

    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const dupReq = req.clone(this.httpOptions);
        return next.handle(dupReq);
    }
}
```

### 3.4 Pipes Customizados

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'contaSelic' })
export class ContaSelicPipe implements PipeTransform {

    transform(value: string): string {
        if (!value) {
            return '';
        }
        // Formatação: XX-XXXX-XXX-XX
        const conta = value.replace(/[^\d]/g, '');
        return conta.replace(/(\d{2})(\d{4})(\d{3})(\d{2})/, '$1-$2-$3-$4');
    }
}
```

```typescript
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'cnpjCpf' })
export class CnpjCpfPipe implements PipeTransform {

    transform(value: string): string {
        if (!value) {
            return '';
        }
        const documento = value.replace(/[^\d]/g, '');
        if (documento.length === 11) {
            return documento.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        }
        if (documento.length === 14) {
            return documento.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        }
        return value;
    }
}
```

### 3.5 Models/Interfaces

```typescript
// Usar classes para models que precisam de comportamento
export class Operacao {
    id: string;
    numero: string;
    data: string;
    situacao: string;

    get isAtiva(): boolean {
        return this.situacao === 'ATU';
    }
}

// Usar interfaces para DTOs simples
export interface FiltroOperacao {
    numeroOperacao?: string;
    codigoOperacao?: string;
    dataMovimento?: string;
}

// Usar interfaces para respostas de API
export interface ResultadoPaginado<T> {
    dados: T[];
    quantidadeRegistros: number;
    pagina: number;
    totalPaginas: number;
}
```

---

## 4. Módulos

### 4.1 Feature Module

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { OperacaoRoutingModule } from './operacao.routing.module';
import { SharedModule } from '../shared/shared.module';

// Pages
import { ConsultaOperacaoComponent } from './pages/consulta-operacao/consulta-operacao.component';
import { DetalheOperacaoComponent } from './pages/detalhe-operacao/detalhe-operacao.component';

@NgModule({
    imports: [
        CommonModule,
        SharedModule,
        OperacaoRoutingModule
    ],
    declarations: [
        ConsultaOperacaoComponent,
        DetalheOperacaoComponent
    ]
})
export class OperacaoModule { }
```

### 4.2 Routing Module com Lazy Loading

```typescript
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ConsultaOperacaoComponent } from './pages/consulta-operacao/consulta-operacao.component';
import { DetalheOperacaoComponent } from './pages/detalhe-operacao/detalhe-operacao.component';

const routes: Routes = [
    { path: '', component: ConsultaOperacaoComponent },
    { path: ':id', component: DetalheOperacaoComponent }
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class OperacaoRoutingModule { }
```

### 4.3 App Routing com Lazy Loading

```typescript
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

const routes: Routes = [
    {
        path: 'operacao',
        loadChildren: './modules/operacao/operacao.module#OperacaoModule'
    },
    {
        path: 'comando',
        loadChildren: './modules/comando/comando.module#ComandoModule'
    },
    {
        path: '',
        redirectTo: '/home',
        pathMatch: 'full'
    }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
```

### 4.4 Shared Module

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Componentes
import { BootstrapInputComponent } from './components/bootstrap-input/bootstrap-input.component';
import { BootstrapModalComponent } from './components/bootstrap-modal/bootstrap-modal.component';
import { BootstrapPaginationComponent } from './components/bootstrap-pagination/bootstrap-pagination.component';

// Pipes
import { ContaSelicPipe } from './pipes/conta-selic.pipe';
import { CnpjCpfPipe } from './pipes/cnpj-cpf.pipe';

// Diretivas
import { TableSelicDirective } from './directives/table-selic.directive';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule
    ],
    declarations: [
        BootstrapInputComponent,
        BootstrapModalComponent,
        BootstrapPaginationComponent,
        ContaSelicPipe,
        CnpjCpfPipe,
        TableSelicDirective
    ],
    exports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        BootstrapInputComponent,
        BootstrapModalComponent,
        BootstrapPaginationComponent,
        ContaSelicPipe,
        CnpjCpfPipe,
        TableSelicDirective
    ]
})
export class SharedModule { }
```

---

## 5. Configurações

### 5.1 Proxy de Desenvolvimento

**proxy.config.js:**
```javascript
const PROXY_CONFIG = {
    '/selic-**/rest/**': {
        target: 'http://localhost:8090',
        secure: false,
        logLevel: 'debug'
    }
};
module.exports = PROXY_CONFIG;
```

### 5.2 TypeScript

**tsconfig.json:**
```json
{
    "compileOnSave": false,
    "compilerOptions": {
        "baseUrl": "./",
        "outDir": "./dist/out-tsc",
        "sourceMap": true,
        "declaration": false,
        "module": "es2015",
        "moduleResolution": "node",
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        "importHelpers": true,
        "target": "es5",
        "skipLibCheck": true,
        "lib": ["es2018", "dom"]
    }
}
```

### 5.3 Angular CLI

**angular.json (principais configurações):**
```json
{
    "projects": {
        "frontend": {
            "architect": {
                "build": {
                    "options": {
                        "outputPath": "dist/frontend",
                        "index": "src/index.html",
                        "main": "src/main.ts",
                        "polyfills": "src/polyfills.ts",
                        "tsConfig": "tsconfig.app.json",
                        "assets": ["src/assets"],
                        "styles": [
                            "src/styles.scss",
                            "node_modules/bootstrap/dist/css/bootstrap.min.css"
                        ],
                        "scripts": [
                            "node_modules/jquery/dist/jquery.min.js",
                            "node_modules/bootstrap/dist/js/bootstrap.min.js"
                        ]
                    }
                },
                "serve": {
                    "options": {
                        "proxyConfig": "proxy.config.js"
                    }
                }
            }
        }
    }
}
```

---

## 6. Integração Maven-Angular

**pom.xml:**
```xml
<plugin>
    <groupId>com.github.eirslett</groupId>
    <artifactId>frontend-maven-plugin</artifactId>
    <version>1.12.1</version>
    <configuration>
        <workingDirectory>frontend</workingDirectory>
        <nodeVersion>v8.11.3</nodeVersion>
        <npmVersion>5.6.0</npmVersion>
    </configuration>
    <executions>
        <execution>
            <id>install node and npm</id>
            <goals><goal>install-node-and-npm</goal></goals>
        </execution>
        <execution>
            <id>npm install</id>
            <goals><goal>npm</goal></goals>
            <configuration>
                <arguments>install</arguments>
            </configuration>
        </execution>
        <execution>
            <id>npm build</id>
            <goals><goal>npm</goal></goals>
            <configuration>
                <arguments>run build</arguments>
            </configuration>
        </execution>
    </executions>
</plugin>
```

---

## 7. Boas Práticas

### 7.1 Clean Code

- Componentes pequenos e focados em uma responsabilidade
- Nomes descritivos para componentes, serviços e variáveis
- Evitar lógica complexa em templates HTML
- Usar async pipe quando possível
- Máximo de 200 linhas por componente

**Exemplo - Componente focado e legível:**
```typescript
// ✅ BOM: Componente pequeno, responsabilidade única
@Component({
    selector: 'selic-filtro-operacao',
    templateUrl: './filtro-operacao.component.html'
})
export class FiltroOperacaoComponent {
    @Output() pesquisar = new EventEmitter<FiltroOperacao>();
    
    filtro: FiltroOperacao = {};
    
    onPesquisar(): void {
        this.pesquisar.emit(this.filtro);
    }
}

// ❌ RUIM: Componente faz muitas coisas
@Component({...})
export class OperacaoComponent {
    // Filtro, listagem, detalhe, edição, exclusão tudo junto
    // 500+ linhas de código
}
```

### 7.2 DRY

- Componentes reutilizáveis no SharedModule
- Pipes para formatação comum
- Diretivas para comportamentos repetitivos
- AbstractHttpService para lógica comum de HTTP

**Exemplo - Reutilização via SharedModule:**
```typescript
// ✅ BOM: Usa pipe compartilhado
<td>{{ operacao.contaCedente | contaSelic }}</td>
<td>{{ operacao.cnpj | cnpjCpf }}</td>

// ❌ RUIM: Formata manualmente em cada componente
<td>{{ formatarConta(operacao.contaCedente) }}</td>
```

### 7.3 TypeScript

- Usar tipagem forte (evitar `any`)
- Interfaces para contratos de dados
- Classes para models com comportamento
- Enums para valores fixos

**Exemplo - Tipagem adequada:**
```typescript
// ✅ BOM: Tipagem forte
consultar(filtro: FiltroOperacao): Observable<ResultadoPaginado<Operacao>> {
    return this.httpClient.get<ResultadoPaginado<Operacao>>(url, { params: filtro });
}

// ❌ RUIM: Uso de any
consultar(filtro: any): Observable<any> {
    return this.httpClient.get(url, { params: filtro });
}
```

### 7.4 RxJS

- Sempre fazer unsubscribe no ngOnDestroy
- Usar `takeUntil` com Subject para gerenciar subscrições
- Preferir async pipe quando possível
- Evitar subscrições aninhadas

**Exemplo - Gerenciamento de subscrições:**
```typescript
// ✅ BOM: Unsubscribe automático com takeUntil
export class MeuComponent implements OnDestroy {
    private destroy$ = new Subject<void>();
    
    ngOnInit(): void {
        this.servico.dados$
            .pipe(takeUntil(this.destroy$))
            .subscribe(dados => this.dados = dados);
    }
    
    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }
}

// ✅ BOM: Async pipe no template (sem necessidade de unsubscribe)
// component.ts
dados$ = this.servico.listar();

// template.html
<div *ngFor="let item of dados$ | async">{{ item.nome }}</div>
```

### 7.5 Performance

- Lazy loading para todos os feature modules
- OnPush change detection quando aplicável
- Evitar operações pesadas em templates
- Usar trackBy em ngFor

### 7.6 Clean Architecture

A Clean Architecture no frontend Angular segue estas regras:

**Regra de Dependência:**
```
pages → services → models ← shared
```

As dependências apontam para o centro (models). Componentes de página conhecem serviços, serviços conhecem models.

**Estrutura das Camadas:**

| Camada | Responsabilidade | Depende de |
|--------|------------------|------------|
| `pages/` | Componentes de página (Smart) | `services`, `models`, `shared` |
| `services/` | Comunicação HTTP, orquestração | `models`, `shared` |
| `models/` | Tipos e interfaces do domínio | Nenhuma |
| `shared/` | Componentes reutilizáveis (Dumb) | `models` |

**Exemplo - Fluxo de uma consulta:**
```
1. ConsultaOperacaoComponent (pages/) recebe ação do usuário
   └── Chama operacaoService.pesquisar(filtro)

2. OperacaoService (services/) faz requisição HTTP
   └── Retorna Observable<ResultadoPaginado<Operacao>>

3. Operacao (models/) define estrutura dos dados
   └── Tipagem forte para o TypeScript

4. BootstrapPaginationComponent (shared/) renderiza paginação
   └── Emite evento de mudança de página

5. Template usa pipes (shared/) para formatação
   └── {{ conta | contaSelic }}
```

**Exemplo - O que cada camada contém:**

```typescript
// MODELS - Interfaces e classes do domínio
// modules/operacao/models/operacao.ts
export class Operacao {
    id: string;
    numeroOperacao: string;
    situacao: string;
    
    // Comportamento do domínio
    get isPendente(): boolean {
        return this.situacao === 'PEN';
    }
}

export interface FiltroOperacao {
    numeroOperacao?: string;
    dataMovimento?: string;
}

// SERVICES - Comunicação e orquestração
// modules/operacao/services/operacao.service.ts
@Injectable({ providedIn: 'root' })
export class OperacaoService extends AbstractHttpService {
    
    pesquisar(filtro: FiltroOperacao): Observable<ResultadoPaginado<Operacao>> {
        return this.httpClient.get<ResultadoPaginado<Operacao>>(
            `${this.URL_ROOT}/v1/operacao`, 
            { params: filtro as any }
        );
    }
}

// PAGES - Smart Components (coordenam fluxo)
// modules/operacao/pages/consulta-operacao/consulta-operacao.component.ts
@Component({
    selector: 'selic-consulta-operacao',
    templateUrl: './consulta-operacao.component.html'
})
export class ConsultaOperacaoComponent implements OnInit {
    resultado: ResultadoPaginado<Operacao>;
    filtroAtual: FiltroOperacao;
    
    constructor(private operacaoService: OperacaoService) {}
    
    consultar(filtro: FiltroOperacao): void {
        this.filtroAtual = filtro;
        this.operacaoService.pesquisar(filtro)
            .subscribe(res => this.resultado = res);
    }
    
    paginar(evento: EventoPaginacao): void {
        this.consultar({ ...this.filtroAtual, pagina: evento.pagina });
    }
}

// SHARED - Dumb Components (reutilizáveis, sem lógica de negócio)
// modules/shared/components/bootstrap-pagination/bootstrap-pagination.component.ts
@Component({
    selector: 'selic-pagination',
    templateUrl: './bootstrap-pagination.component.html'
})
export class BootstrapPaginationComponent {
    @Input() totalRegistros: number;
    @Input() paginaAtual: number;
    @Output() mudarPagina = new EventEmitter<EventoPaginacao>();
    
    onMudarPagina(pagina: number): void {
        this.mudarPagina.emit({ pagina, totalRegistros: this.totalRegistros });
    }
}
```

**Smart Components vs Dumb Components:**

| Aspecto | Smart (Pages) | Dumb (Shared) |
|---------|---------------|---------------|
| Localização | `modules/{feature}/pages/` | `modules/shared/components/` |
| Injeta serviços | ✅ Sim | ❌ Não |
| Conhece o negócio | ✅ Sim | ❌ Não |
| Comunicação | Chama serviços | @Input/@Output |
| Reutilização | Específico da feature | Reutilizável em todo app |

**Anti-patterns a evitar:**

```typescript
// ❌ RUIM: Lógica de negócio em componente shared
@Component({ selector: 'selic-tabela-operacao' })
export class TabelaOperacaoComponent {
    constructor(private operacaoService: OperacaoService) {}  // Shared não deve injetar serviços de negócio
    
    excluir(id: number): void {
        this.operacaoService.excluir(id).subscribe();  // Lógica de negócio em componente shared!
    }
}

// ❌ RUIM: Service com lógica de apresentação
@Injectable()
export class OperacaoService {
    formatarParaExibicao(op: Operacao): string {  // Isso é responsabilidade de Pipe!
        return `${op.numero} - ${op.situacao}`;
    }
}

// ❌ RUIM: Componente de página importando diretamente HttpClient
@Component({...})
export class ConsultaOperacaoComponent {
    constructor(private http: HttpClient) {}  // Deveria usar OperacaoService
    
    consultar(): void {
        this.http.get('/api/operacao').subscribe();  // Acesso direto ao HTTP
    }
}
```

---

## 9. Segurança OWASP (Frontend)

### 9.1 XSS (Cross-Site Scripting)

O Angular oferece proteção automática contra XSS, mas é importante seguir boas práticas:

```typescript
// ✅ Angular sanitiza automaticamente interpolações
<p>{{ userInput }}</p>  // Seguro - Angular escapa HTML

// ⚠️ CUIDADO: innerHTML requer sanitização
@Component({
    template: `<div [innerHTML]="trustedHtml"></div>`
})
export class SafeHtmlComponent {
    constructor(private sanitizer: DomSanitizer) {}
    
    get trustedHtml() {
        // ✅ Usar sanitizer para HTML dinâmico
        return this.sanitizer.bypassSecurityTrustHtml(this.htmlContent);
    }
}

// ❌ NUNCA: Desabilitar sanitização sem necessidade real
this.sanitizer.bypassSecurityTrustScript(untrustedInput); // PERIGOSO!
```

**Regras:**
- Nunca usar `bypassSecurityTrust*` sem validação rigorosa
- Evitar `innerHTML` quando possível
- Usar Angular template syntax para binding de dados

### 9.2 CSRF (Cross-Site Request Forgery)

```typescript
// ✅ Angular HttpClient envia automaticamente cookies de CSRF
// Configuração no interceptor
export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
    const csrfToken = getCsrfTokenFromCookie();
    
    if (csrfToken && !req.method.match(/GET|HEAD|OPTIONS/)) {
        req = req.clone({
            setHeaders: { 'X-XSRF-TOKEN': csrfToken }
        });
    }
    
    return next(req);
};
```

### 9.3 Content Security Policy (CSP)

```html
<!-- index.html - Headers CSP -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline';
               img-src 'self' data:;
               connect-src 'self' https://api.selic.bcb.gov.br">
```

### 9.4 Armazenamento Seguro

```typescript
// ❌ NUNCA: Armazenar tokens sensíveis em localStorage
localStorage.setItem('token', sensitiveToken); // VULNERÁVEL a XSS

// ✅ Usar HttpOnly cookies (gerenciados pelo backend)
// Ou para dados menos sensíveis, usar sessionStorage
sessionStorage.setItem('preferencias', JSON.stringify(prefs));

// ✅ Para apps híbridos: Capacitor Secure Storage
import { SecureStoragePlugin } from 'capacitor-secure-storage-plugin';
await SecureStoragePlugin.set({ key: 'token', value: token });
```

### 9.5 Validação de Entrada

```typescript
// ✅ Usar Reactive Forms com validadores
this.form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    documento: ['', [Validators.required, Validators.pattern(/^\d{11,14}$/)]],
    valor: ['', [Validators.required, Validators.min(0)]]
});

// ✅ Diretivas de sanitização customizadas
@Directive({ selector: '[selicSanitize]' })
export class SanitizeDirective {
    @HostListener('blur', ['$event.target'])
    onBlur(target: HTMLInputElement) {
        target.value = this.sanitize(target.value);
    }
    
    private sanitize(value: string): string {
        return value.replace(/[<>'"&]/g, ''); // Remove caracteres perigosos
    }
}
```

---

## 10. Segurança RBAC (Frontend)

### 10.1 Auth Guard

```typescript
// guards/auth.guard.ts
export const authGuard: CanActivateFn = () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    if (authService.isAuthenticated()) {
        return true;
    }
    
    return router.createUrlTree(['/login'], {
        queryParams: { returnUrl: router.url }
    });
};

// guards/role.guard.ts
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
    return () => {
        const authService = inject(AuthService);
        const userRoles = authService.getUserRoles();
        
        return allowedRoles.some(role => userRoles.includes(role));
    };
};

// Uso nas rotas
export const routes: Routes = [
    {
        path: 'admin',
        loadComponent: () => import('./admin/admin.component'),
        canActivate: [authGuard, roleGuard(['SELIC.ADMIN'])]
    },
    {
        path: 'operacao',
        loadComponent: () => import('./operacao/operacao.component'),
        canActivate: [authGuard, roleGuard(['SELIC.OPERADOR', 'SELIC.CONSULTA'])]
    }
];
```

### 10.2 Role Directive

```typescript
// directives/has-role.directive.ts
@Directive({
    selector: '[selicHasRole]',
    standalone: true
})
export class HasRoleDirective implements OnInit {
    private authService = inject(AuthService);
    private templateRef = inject(TemplateRef<any>);
    private viewContainer = inject(ViewContainerRef);
    
    @Input('selicHasRole') requiredRoles: string[] = [];
    
    ngOnInit() {
        const userRoles = this.authService.getUserRoles();
        const hasRole = this.requiredRoles.some(role => userRoles.includes(role));
        
        if (hasRole) {
            this.viewContainer.createEmbeddedView(this.templateRef);
        } else {
            this.viewContainer.clear();
        }
    }
}

// Uso no template
<button *selicHasRole="['SELIC.ADMIN']" (click)="excluir()">
    Excluir
</button>

<div *selicHasRole="['SELIC.OPERADOR', 'SELIC.ADMIN']">
    Conteúdo restrito
</div>
```

### 10.3 Auth Interceptor

```typescript
// interceptors/auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    const token = authService.getAccessToken();
    
    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }
    
    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                authService.logout();
                router.navigate(['/login']);
            }
            if (error.status === 403) {
                router.navigate(['/acesso-negado']);
            }
            return throwError(() => error);
        })
    );
};
```

### 10.4 Auth Service

```typescript
// services/auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthService {
    private currentUser = signal<User | null>(null);
    private tokenExpiration = signal<Date | null>(null);
    
    isAuthenticated = computed(() => {
        const user = this.currentUser();
        const expiration = this.tokenExpiration();
        return user !== null && expiration !== null && expiration > new Date();
    });
    
    getUserRoles(): string[] {
        const user = this.currentUser();
        return user?.roles ?? [];
    }
    
    hasRole(role: string): boolean {
        return this.getUserRoles().includes(role);
    }
    
    hasAnyRole(roles: string[]): boolean {
        return roles.some(role => this.hasRole(role));
    }
    
    login(credentials: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>('/api/auth/login', credentials).pipe(
            tap(response => {
                this.currentUser.set(response.user);
                this.tokenExpiration.set(new Date(response.expiresAt));
                this.storeToken(response.accessToken);
            })
        );
    }
    
    logout(): void {
        this.currentUser.set(null);
        this.tokenExpiration.set(null);
        this.clearToken();
    }
}
```

### 10.5 Menu Dinâmico por Role

```typescript
// services/menu.service.ts
@Injectable({ providedIn: 'root' })
export class MenuService {
    private authService = inject(AuthService);
    
    menuItems = computed(() => {
        const allItems: MenuItem[] = [
            { label: 'Home', path: '/home', roles: ['*'] },
            { label: 'Operações', path: '/operacao', roles: ['SELIC.OPERADOR', 'SELIC.CONSULTA'] },
            { label: 'Relatórios', path: '/relatorios', roles: ['SELIC.AUDITOR', 'SELIC.ADMIN'] },
            { label: 'Administração', path: '/admin', roles: ['SELIC.ADMIN'] }
        ];
        
        return allItems.filter(item => 
            item.roles.includes('*') || 
            this.authService.hasAnyRole(item.roles)
        );
    });
}
```

---

## 8. Checklist de Revisão

### 8.1 Arquitetura

- [ ] Módulo de feature segue estrutura pages/services/models
- [ ] Componentes de página em `pages/`
- [ ] Componentes reutilizáveis em `shared/`
- [ ] Serviços estendem AbstractHttpService
- [ ] Models tipados corretamente

### 8.2 Código

- [ ] Tipagem TypeScript adequada (sem `any`)
- [ ] Observables com unsubscribe adequado
- [ ] Sem console.log em código de produção
- [ ] Sem lógica complexa em templates

### 8.3 Módulos

- [ ] Feature modules com lazy loading
- [ ] Pipes e diretivas no SharedModule
- [ ] Imports mínimos necessários

### 8.4 Configuração

- [ ] Proxy configurado para desenvolvimento
- [ ] .npmrc apontando para Nexus interno
- [ ] Build Maven integrado funcionando

### 8.5 UI/UX

- [ ] Uso de componentes selic-ng-*
- [ ] Formatação via pipes (contaSelic, cnpjCpf)
- [ ] Feedback visual de loading/erro
- [ ] Responsividade básica com Bootstrap
