# Regras de Desenvolvimento Backend - Sistema SELIC

Este documento estabelece as regras, princípios e padrões para o desenvolvimento backend dos microsserviços do ecossistema SELIC.

---

## 1. Clean Architecture

### 1.1 Princípios Fundamentais

A arquitetura segue os princípios da Clean Architecture combinados com DDD (Domain-Driven Design):

- **Independência de Frameworks**: O domínio não depende de frameworks externos
- **Testabilidade**: Regras de negócio testáveis sem UI, banco de dados ou serviços externos
- **Independência de UI**: A interface pode mudar sem alterar o restante do sistema
- **Independência de Banco de Dados**: Oracle pode ser trocado sem afetar regras de negócio
- **Independência de Agentes Externos**: Regras de negócio não conhecem o mundo externo

### 1.2 Camadas da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERFACES                                │
│  (Controllers REST, Feign Clients, APIs)                        │
│  - Recebe requisições externas                                  │
│  - Converte dados de entrada/saída                              │
│  - Delega para camada de aplicação                              │
├─────────────────────────────────────────────────────────────────┤
│                        APLICAÇÃO                                 │
│  (Serviços de Aplicação / Casos de Uso)                         │
│  - Orquestra fluxo de negócio                                   │
│  - Coordena entidades e serviços de domínio                     │
│  - Não contém regras de negócio                                 │
├─────────────────────────────────────────────────────────────────┤
│                         DOMÍNIO                                  │
│  (Entidades, DTOs, Enums, Repositories, Serviços de Domínio)    │
│  - Contém regras de negócio                                     │
│  - Entidades ricas com comportamento                            │
│  - Interfaces de repositório (não implementações)               │
├─────────────────────────────────────────────────────────────────┤
│                     INFRAESTRUTURA                               │
│  (Config, JMS, Persistence, Implementações)                     │
│  - Implementações técnicas                                      │
│  - Configurações de framework                                   │
│  - Adaptadores para serviços externos                           │
└─────────────────────────────────────────────────────────────────┘
```

### 1.3 Estrutura de Pacotes

```
src/main/java/br/gov/bcb/demab/dicel/selic/{nome-servico}/
├── dominio/                    # NÚCLEO - Regras de negócio
│   ├── dto/                    # Data Transfer Objects
│   ├── entidade/               # Entidades JPA do domínio
│   ├── enums/                  # Enumerações do domínio
│   ├── exception/              # Exceções de negócio
│   ├── repository/             # Interfaces de repositório
│   ├── client/                 # Interfaces Feign Client
│   └── projection/             # Projeções JPA
│
├── aplicacao/                  # CASOS DE USO - Orquestração
│   └── Servico*.java           # Serviços de aplicação
│
├── infraestrutura/             # ADAPTADORES - Implementações técnicas
│   ├── config/                 # Configurações Spring/Security
│   ├── jms/                    # Listeners e config de mensageria
│   └── persistence/            # Implementações de repositório
│
├── interfaces/                 # INTERFACE - Entrada/Saída
│   └── rest/
│       ├── v1/                 # Interfaces de API (contratos)
│       │   ├── *API.java       # Interface com anotações OpenAPI
│       │   └── controller/     # Implementações dos controllers
│       └── v2/                 # Versionamento de API
│
└── monitoring/                 # Monitoramento (opcional)
```

### 1.4 Regra de Dependência

As dependências apontam SEMPRE para dentro (em direção ao domínio):

```
interfaces → aplicacao → dominio ← infraestrutura
```

- **interfaces** pode importar de: `aplicacao`, `dominio`
- **aplicacao** pode importar de: `dominio`
- **infraestrutura** pode importar de: `dominio`
- **dominio** NÃO importa de nenhuma outra camada

### 1.5 Exemplo Real: selic-operacao-api

**Interface (API REST):**
```java
// interfaces/rest/v1/OperacaoAPI.java - CONTRATO
@RequestMapping("${api.path}/v1/operacao")
@Tag(name = "Operacao", description = "Serviços de consulta da entidade Operação.")
@ApiResponses({
    @ApiResponse(responseCode = "400", description = ConstantesStatusAPI.BAD_REQUEST_MESSAGE),
    @ApiResponse(responseCode = "401", description = ConstantesStatusAPI.UNAUTHORIZED),
    // ... outros responses
})
public interface OperacaoAPI {

    @Operation(summary = "Consulta operações expiráveis por tempo")
    @ApiResponse(responseCode = "200", description = ConstantesStatusAPI.OK_MESSAGE)
    @Secured("SELIC.RECUPERAR_OPERACOES_EXPIRAVEIS_POR_TEMPO")
    @GetMapping("expiraveisPorTempo")
    ResponseEntity<List<Operacao>> recuperarOperacoesExpiraveisPorTempo();

    @Operation(summary = "Consulta informações de uma operação")
    @Secured("SELIC.RECUPERAR_INFORMACOES_OPERACAO")
    @GetMapping("info")
    ResponseEntity<RespostaDadosOperacao> consultarInformacoesOperacao(
        @Parameter(description = "Número da operação") @RequestParam String numeroOperacao,
        @Parameter(description = "Data de movimento") @RequestParam LocalDate dataMovimento,
        @Parameter(description = "Identificação do emissor") @RequestParam String identificacaoEmissor
    );
}
```

```java
// interfaces/rest/v1/controller/OperacaoController.java - IMPLEMENTAÇÃO
@RequiredArgsConstructor
@RestController
public class OperacaoController implements OperacaoAPI {

    private final ServicoOperacao servicoOperacao;  // Camada de aplicação

    @Override
    public ResponseEntity<List<Operacao>> recuperarOperacoesExpiraveisPorTempo() {
        return ResponseEntity.ok(servicoOperacao.recuperarOperacoesExpiraveisPorTempo());
    }

    @Override
    public ResponseEntity<RespostaDadosOperacao> consultarInformacoesOperacao(
            String numeroOperacao, LocalDate dataMovimento, String identificacaoEmissor) {
        return ResponseEntity.of(
            servicoOperacao.consultarInformacoesOperacao(numeroOperacao, dataMovimento, identificacaoEmissor)
        );
    }
}
```

**Aplicação (Caso de Uso):**
```java
// aplicacao/ServicoOperacao.java
@RequiredArgsConstructor
@Service
public class ServicoOperacao {

    // Repositórios do domínio
    private final OperacaoRepository operacaoRepository;
    private final ComandoRepository comandoRepository;
    private final AcordoRepository acordoRepository;

    // Clientes externos (interfaces no domínio, implementação via Feign)
    private final GradeAPIClient gradeAPIClient;
    private final CicloVidaClient cicloVidaClient;
    private final ConfiguracaoClient configuracaoClient;

    // Cache de domínio
    private final CacheConta cacheConta;
    private final CacheParticipante cacheParticipante;

    public List<Operacao> recuperarOperacoesExpiraveisPorTempo() {
        // Obtém data de movimento de serviço externo
        LocalDate dataMovimento = gradeAPIClient.obterDataMovimento().getDataMovimentoCorrente();

        // Obtém configurações
        LocalTime intervaloLimiteLAN = configuracaoClient.recuperarIntervaloPendenciaLancamento();
        LocalTime intervaloLimitePEO = configuracaoClient.recuperarIntervaloPendenciaOperacao();

        // Busca operações usando repositório
        List<Operacao> operacoesExpiraveisPorTempo = new ArrayList<>();
        operacoesExpiraveisPorTempo.addAll(
            operacaoRepository.buscarOperacoesPendentesPorDataMovimentoAntesDoHorarioLimite(
                EnumSituacaoOperacao.getSituacoesPendenteLancamento(), 
                dataMovimento, 
                gerarDataHoraLimite(intervaloLimiteLAN)
            )
        );

        // Enriquece entidades
        operacoesExpiraveisPorTempo.forEach(operacao -> {
            operacao.preencherAtributosAgregados();  // Método da entidade
        });

        return operacoesExpiraveisPorTempo;
    }

    public Optional<RespostaDadosOperacao> consultarInformacoesOperacao(
            String numeroOperacao, LocalDate dataMovimento, String identificacaoEmissor) {
        
        var operacao = operacaoRepository.findByNumeroOperacaoAndDataMovimentoAndSituacaoOperacaoIn(
            numeroOperacao, dataMovimento, EnumSituacaoOperacao.getSituacoesValidas()
        );

        return preencherDadosOperacao(operacao, identificacaoEmissor);
    }

    private LocalDateTime gerarDataHoraLimite(LocalTime intervalo) {
        return LocalDateTime.now().minusSeconds(intervalo.toSecondOfDay());
    }
}
```

**Domínio (Entidade Rica):**
```java
// dominio/entidade/Operacao.java
@Getter
@Setter
@Entity
@Table(name = "SEL_OPE_OPE")
public class Operacao implements Serializable {

    @Id
    @Column(name = "NUM_OPE")
    private String numeroOperacao;

    @Column(name = "DAT_MOVTO")
    private LocalDate dataMovimento;

    @Enumerated(EnumType.STRING)
    @Column(name = "COD_SIT_OPE")
    private EnumSituacaoOperacao situacaoOperacao;

    @OneToMany(mappedBy = "operacao", fetch = FetchType.LAZY)
    private Set<ComandoOperacao> comandos;

    // Atributos transient calculados
    @Transient
    private String chaveAssociacaoCedente;

    @Transient
    private String chaveAssociacaoCessionaria;

    // COMPORTAMENTO NO DOMÍNIO - Entidade Rica
    public void preencherAtributosAgregados() {
        if (comandos != null) {
            comandos.stream()
                .filter(ComandoOperacao::isCedente)
                .findFirst()
                .ifPresent(cmd -> {
                    this.chaveAssociacaoCedente = cmd.getChaveOperacaoAssociada();
                    this.numeroPromessaCedente = cmd.getNumeroPromessa();
                });

            comandos.stream()
                .filter(ComandoOperacao::isCessionario)
                .findFirst()
                .ifPresent(cmd -> {
                    this.chaveAssociacaoCessionaria = cmd.getChaveOperacaoAssociada();
                    this.numeroPromessaCessionaria = cmd.getNumeroPromessa();
                });
        }
    }
}
```

**Domínio (Feign Client Interface):**
```java
// dominio/client/CicloVidaClient.java
@FeignClient(
    value = "cicloVidaClient", 
    url = "${selic.ciclo-vida.url}", 
    configuration = OperacaoAPIFeignConfiguration.class
)
public interface CicloVidaClient {

    @GetMapping("/selic/fechado")
    Boolean verificarSelicFechadoParaSistema(@RequestParam("siglaSistema") String siglaSistema);
}
```

**Domínio (Repository Interface):**
```java
// dominio/repository/OperacaoRepository.java
@Repository
public interface OperacaoRepository extends JpaRepository<Operacao, OperacaoId> {

    @Query("SELECT o FROM Operacao o WHERE o.dataMovimento = :data AND o.situacaoOperacao = :situacao")
    List<Operacao> findByDataMovimentoAndSituacaoOperacao(
        @Param("data") LocalDate dataMovimento,
        @Param("situacao") EnumSituacaoOperacao situacao
    );

    @EntityGraph(attributePaths = {"comandos"})
    Optional<Operacao> findByNumeroOperacaoAndDataMovimentoAndSituacaoOperacaoIn(
        String numeroOperacao, 
        LocalDate dataMovimento, 
        List<EnumSituacaoOperacao> situacoes
    );
}
```

---

## 2. Arquitetura de Microsserviços

### 2.1 Princípios

- Cada microsserviço tem um propósito único e bem definido
- Comunicação via REST APIs (Feign Client) ou mensageria (JMS/ActiveMQ/IBM MQ)
- Padrão Database per Service - cada serviço possui seu próprio banco

### 2.2 Nomenclatura de Projetos

- Prefixo padrão: `selic-`
- Nome descritivo em português: `selic-operacao-api`, `selic-calendario-api`, `selic-arquivo`
- GroupId Maven: `selic.selic`
- Parent comum: `selic-parent-spring-boot`

---

## 3. Stack Tecnológica

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| Java | 25 (preferido), 21 LTS (permitido) | Linguagem principal |
| Spring Boot | 3.4.x | Framework de aplicação |
| Spring Cloud | 2024.0.x | Cloud-native features |
| Maven | 3.9.x | Build e gerenciamento de dependências |
| Oracle Database | 23c | Banco de dados principal |
| Liquibase | 4.30.0 | Versionamento de banco de dados |
| JUnit 5 | 5.11.x | Framework de testes |
| Mockito | 5.14.x | Framework de mocking |
| Lombok | latest | Redução de boilerplate |
| Jasypt | 3.0.5 | Criptografia de propriedades |

### 3.1 Bibliotecas Internas Obrigatórias

```xml
<dependency>
    <groupId>selic.selic</groupId>
    <artifactId>selic-utils</artifactId>
</dependency>

<dependency>
    <groupId>selic.selic</groupId>
    <artifactId>selic-versao</artifactId>
</dependency>

<dependency>
    <groupId>selic.selic</groupId>
    <artifactId>selic-archunit</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 3A. Java 25 - Práticas Modernas

### 3A.1 Virtual Threads (Project Loom)

Virtual Threads são threads leves gerenciadas pela JVM, permitindo milhões de threads concorrentes com baixo custo.

**Configuração no Spring Boot 3.4+:**

```yaml
# application.yml
spring:
  threads:
    virtual:
      enabled: true  # Habilita Virtual Threads para todo o app
```

**Uso Manual:**

```java
// ✅ Criar Virtual Thread diretamente
Thread.startVirtualThread(() -> {
    processarOperacao(operacao);
});

// ✅ ExecutorService com Virtual Threads
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Resultado>> futures = operacoes.stream()
        .map(op -> executor.submit(() -> processar(op)))
        .toList();
    
    // Aguardar todos os resultados
    for (Future<Resultado> future : futures) {
        resultados.add(future.get());
    }
}

// ✅ Parallel Stream com Virtual Threads (Spring Boot config acima)
List<OperacaoProcessada> resultados = operacoes.parallelStream()
    .map(this::processar)
    .toList();
```

**Quando usar Virtual Threads:**

| Cenário | Recomendação |
|---------|--------------|
| I/O Bound (HTTP, DB, File) | ✅ Virtual Threads |
| CPU Bound (cálculos pesados) | ❌ Platform Threads |
| Chamadas bloqueantes a serviços externos | ✅ Virtual Threads |
| Processamento de lotes grandes | ✅ Virtual Threads |

**Anti-patterns com Virtual Threads:**

```java
// ❌ NUNCA: Usar synchronized com operações bloqueantes
synchronized (lock) {
    httpClient.send(request);  // Bloqueia carrier thread!
}

// ✅ Usar ReentrantLock
private final ReentrantLock lock = new ReentrantLock();

lock.lock();
try {
    httpClient.send(request);
} finally {
    lock.unlock();
}

// ❌ NUNCA: ThreadLocal em Virtual Threads de longa duração
// ✅ Usar ScopedValue (ver seção 3A.7)
```

### 3A.2 Singleton Moderno (Enum Singleton)

O padrão Singleton mais seguro e recomendado em Java moderno:

```java
// ✅ PADRÃO RECOMENDADO: Enum Singleton
// Thread-safe, serialization-safe, reflection-safe
public enum ConfiguracaoSingleton {
    INSTANCE;
    
    private final Map<String, String> configs = new ConcurrentHashMap<>();
    
    public String getConfig(String key) {
        return configs.get(key);
    }
    
    public void setConfig(String key, String value) {
        configs.put(key, value);
    }
}

// Uso
ConfiguracaoSingleton.INSTANCE.setConfig("timeout", "30");
String timeout = ConfiguracaoSingleton.INSTANCE.getConfig("timeout");
```

**Alternativa: Holder Pattern (Lazy Initialization):**

```java
// ✅ Padrão Holder - Lazy, thread-safe, sem synchronized
public final class CacheSingleton {
    
    private CacheSingleton() {}
    
    // Classe interna só é carregada quando getInstance() é chamado
    private static final class Holder {
        private static final CacheSingleton INSTANCE = new CacheSingleton();
    }
    
    public static CacheSingleton getInstance() {
        return Holder.INSTANCE;
    }
    
    // Métodos de negócio
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    
    public void put(String key, Object value) {
        cache.put(key, value);
    }
    
    public Optional<Object> get(String key) {
        return Optional.ofNullable(cache.get(key));
    }
}
```

**No Spring Boot (Singleton por padrão):**

```java
// ✅ Spring Beans já são Singleton por padrão
@Service
public class ServicoOperacao {
    // Instância única gerenciada pelo Spring
}

// Se precisar de escopo diferente:
@Scope("prototype")  // Nova instância a cada injeção
@Scope("request")    // Uma instância por request HTTP
```

### 3A.3 Records (Imutáveis por Design)

Records são classes imutáveis concisas, ideais para DTOs:

```java
// ✅ Record para DTO (substitui classes com getters/equals/hashCode)
public record OperacaoDTO(
    String numero,
    LocalDate dataMovimento,
    BigDecimal valor,
    SituacaoOperacao situacao
) {
    // Validação no construtor canônico
    public OperacaoDTO {
        Objects.requireNonNull(numero, "Número é obrigatório");
        Objects.requireNonNull(dataMovimento, "Data é obrigatória");
        if (valor != null && valor.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Valor não pode ser negativo");
        }
    }
    
    // Métodos adicionais
    public boolean isPendente() {
        return situacao == SituacaoOperacao.PENDENTE;
    }
}

// ✅ Record para Value Objects
public record ContaSelic(String numero) {
    private static final Pattern PATTERN = Pattern.compile("\\d{2}-\\d{4}-\\d{3}-\\d{2}");
    
    public ContaSelic {
        if (!PATTERN.matcher(numero).matches()) {
            throw new IllegalArgumentException("Conta SELIC inválida: " + numero);
        }
    }
    
    public String formatado() {
        return numero;
    }
    
    public String semMascara() {
        return numero.replaceAll("-", "");
    }
}

// ✅ Record com Builder (via lombok ou manual)
@Builder
public record FiltroOperacao(
    String numeroOperacao,
    LocalDate dataInicio,
    LocalDate dataFim,
    List<SituacaoOperacao> situacoes
) {
    public FiltroOperacao {
        situacoes = situacoes != null ? List.copyOf(situacoes) : List.of();
    }
}
```

### 3A.4 Sealed Classes (Hierarquias Fechadas)

Sealed classes restringem quais classes podem estender:

```java
// ✅ Hierarquia fechada - compilador conhece todas as subclasses
public sealed interface Comando permits ComandoCedente, ComandoCessionario, ComandoRecompra {
    String getNumero();
    LocalDate getData();
}

public record ComandoCedente(
    String numero, 
    LocalDate data, 
    String contaCedente
) implements Comando {
    @Override
    public String getNumero() { return numero; }
    @Override
    public LocalDate getData() { return data; }
}

public record ComandoCessionario(
    String numero, 
    LocalDate data, 
    String contaCessionario
) implements Comando {
    @Override
    public String getNumero() { return numero; }
    @Override
    public LocalDate getData() { return data; }
}

public record ComandoRecompra(
    String numero, 
    LocalDate data, 
    BigDecimal taxa
) implements Comando {
    @Override
    public String getNumero() { return numero; }
    @Override
    public LocalDate getData() { return data; }
}

// ✅ Pattern matching exaustivo (compilador garante todos os casos)
public BigDecimal calcularTaxa(Comando comando) {
    return switch (comando) {
        case ComandoCedente c -> BigDecimal.valueOf(0.001);
        case ComandoCessionario c -> BigDecimal.valueOf(0.002);
        case ComandoRecompra c -> c.taxa();
    };
}
```

### 3A.5 Pattern Matching Avançado

```java
// ✅ Pattern matching com instanceof
public String descrever(Object obj) {
    return switch (obj) {
        case String s when s.isBlank() -> "String vazia";
        case String s -> "String: " + s;
        case Integer i when i < 0 -> "Número negativo: " + i;
        case Integer i -> "Número: " + i;
        case List<?> list when list.isEmpty() -> "Lista vazia";
        case List<?> list -> "Lista com " + list.size() + " elementos";
        case null -> "Valor nulo";
        default -> "Objeto: " + obj.getClass().getSimpleName();
    };
}

// ✅ Record patterns (deconstrução)
public void processar(Object obj) {
    if (obj instanceof OperacaoDTO(String numero, LocalDate data, var valor, var situacao)) {
        log.info("Operação {} de {} com valor {}", numero, data, valor);
    }
}

// ✅ Nested record patterns
public record Endereco(String rua, String cidade) {}
public record Participante(String nome, Endereco endereco) {}

public String getCidade(Object obj) {
    return switch (obj) {
        case Participante(var nome, Endereco(var rua, var cidade)) -> cidade;
        default -> "Desconhecida";
    };
}
```

### 3A.6 Structured Concurrency (Preview → Estável em 25)

Gerencia múltiplas tasks concorrentes como uma unidade:

```java
import java.util.concurrent.StructuredTaskScope;

// ✅ ShutdownOnFailure - Cancela todas se uma falhar
public OperacaoCompleta buscarOperacaoCompleta(String id) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        
        Subtask<Operacao> operacaoTask = scope.fork(() -> 
            operacaoService.buscar(id)
        );
        
        Subtask<List<Comando>> comandosTask = scope.fork(() -> 
            comandoService.buscarPorOperacao(id)
        );
        
        Subtask<Participante> participanteTask = scope.fork(() -> 
            participanteService.buscar(id)
        );
        
        // Aguarda todas ou falha se alguma falhar
        scope.join().throwIfFailed();
        
        return new OperacaoCompleta(
            operacaoTask.get(),
            comandosTask.get(),
            participanteTask.get()
        );
    }
}

// ✅ ShutdownOnSuccess - Retorna a primeira que completar
public String buscarDeQualquerFonte(String id) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnSuccess<String>()) {
        
        scope.fork(() -> buscarDoCache(id));
        scope.fork(() -> buscarDoBanco(id));
        scope.fork(() -> buscarDoServico(id));
        
        scope.join();
        
        return scope.result();  // Primeiro resultado disponível
    }
}
```

### 3A.7 Scoped Values (Substitui ThreadLocal)

ScopedValues são a alternativa moderna ao ThreadLocal, otimizada para Virtual Threads:

```java
// ✅ Declaração do ScopedValue
public final class ContextoOperacao {
    public static final ScopedValue<String> USUARIO_LOGADO = ScopedValue.newInstance();
    public static final ScopedValue<String> TRACE_ID = ScopedValue.newInstance();
}

// ✅ Definir valor em um escopo
public void processarRequisicao(HttpServletRequest request) {
    String usuario = extrairUsuario(request);
    String traceId = UUID.randomUUID().toString();
    
    ScopedValue.where(ContextoOperacao.USUARIO_LOGADO, usuario)
        .where(ContextoOperacao.TRACE_ID, traceId)
        .run(() -> {
            // Todo código neste escopo tem acesso aos valores
            processarOperacao();
        });
}

// ✅ Ler valor em qualquer lugar do escopo
@Service
public class ServicoAuditoria {
    
    public void registrar(String acao) {
        String usuario = ContextoOperacao.USUARIO_LOGADO.get();
        String traceId = ContextoOperacao.TRACE_ID.get();
        
        log.info("[{}] Usuário {} executou: {}", traceId, usuario, acao);
    }
}

// ✅ Com retorno de valor
public Resultado processarComContexto() {
    return ScopedValue.where(ContextoOperacao.TRACE_ID, "abc-123")
        .call(() -> {
            return executarLogica();
        });
}
```

### 3A.8 String Templates (Preview → Estável)

Interpolação de strings mais segura e legível:

```java
// ✅ STR template processor (interpolação simples)
String nome = "Maria";
int idade = 30;
String mensagem = STR."Olá, \{nome}! Você tem \{idade} anos.";

// ✅ Expressões complexas
String info = STR."Total: \{operacoes.stream().mapToDouble(Operacao::getValor).sum()}";

// ✅ Multi-line
String json = STR."""
    {
        "numero": "\{operacao.getNumero()}",
        "data": "\{operacao.getData()}",
        "valor": \{operacao.getValor()}
    }
    """;

// ✅ FMT template processor (formatação)
double valor = 1234567.89;
String formatado = FMT."Valor: R$ %.2f\{valor}";  // "Valor: R$ 1234567,89"

// ✅ RAW template processor (para processar manualmente)
StringTemplate template = RAW."SELECT * FROM operacao WHERE id = \{id}";
// Permite validar/escapar antes de usar
```

### 3A.9 Gatherers (Stream API Avançada)

Nova API para operações intermediárias customizadas em Streams:

```java
import java.util.stream.Gatherers;

// ✅ windowFixed - Agrupa em janelas fixas
List<List<Operacao>> lotes = operacoes.stream()
    .gather(Gatherers.windowFixed(100))  // Lotes de 100
    .toList();

// ✅ windowSliding - Janela deslizante
List<List<Double>> medias = valores.stream()
    .gather(Gatherers.windowSliding(3))  // Janelas de 3 elementos
    .map(this::calcularMedia)
    .toList();

// ✅ fold - Agregação com estado
Optional<BigDecimal> soma = operacoes.stream()
    .map(Operacao::getValor)
    .gather(Gatherers.fold(
        () -> BigDecimal.ZERO,
        BigDecimal::add
    ))
    .findFirst();

// ✅ scan - Agregação progressiva (cada passo)
List<BigDecimal> somaAcumulada = valores.stream()
    .gather(Gatherers.scan(
        () -> BigDecimal.ZERO,
        BigDecimal::add
    ))
    .toList();

// ✅ mapConcurrent - Map paralelo com limite
List<Resultado> resultados = operacoes.stream()
    .gather(Gatherers.mapConcurrent(10, this::processarRemoto))  // Max 10 concurrent
    .toList();
```

### 3A.10 Sequenced Collections

Interfaces para coleções com ordem definida:

```java
// ✅ SequencedCollection - Acesso a primeiro/último
SequencedCollection<Operacao> operacoes = new ArrayList<>();
operacoes.addFirst(primeiraOp);
operacoes.addLast(ultimaOp);

Operacao primeira = operacoes.getFirst();
Operacao ultima = operacoes.getLast();

// ✅ Visão reversa
SequencedCollection<Operacao> reversed = operacoes.reversed();
for (Operacao op : reversed) {
    // Itera de trás para frente
}

// ✅ SequencedMap
SequencedMap<String, Operacao> mapa = new LinkedHashMap<>();
mapa.putFirst("001", op1);
mapa.putLast("999", op999);

Map.Entry<String, Operacao> primeiraEntry = mapa.firstEntry();
Map.Entry<String, Operacao> ultimaEntry = mapa.pollLastEntry();  // Remove e retorna
```

### 3A.11 Configuração JVM para Java 25

```properties
# JAVA_OPTS recomendadas para produção
JAVA_OPTS="
  -XX:+UseZGC                          # ZGC para baixa latência
  -XX:+ZGenerational                   # ZGC geracional (Java 21+)
  -XX:MaxRAMPercentage=75              # 75% da RAM do container
  -XX:+UseContainerSupport             # Respeitar limites do container
  -XX:+ExitOnOutOfMemoryError          # Reiniciar em OOM
  --enable-preview                     # Features preview (se usadas)
  -Djava.util.concurrent.ForkJoinPool.common.parallelism=0  # Virtual threads no parallelStream
"
```

---

## 4. Padrões de Código

### 4.1 Entidades JPA

```java
@Getter
@Setter
@Entity
@Table(name = "SEL_XXX_YYY")
@SequenceGenerator(name = "SEQ_SEL_XXX", sequenceName = "SEQ_SEL_XXX", allocationSize = 1)
public class NomeDaEntidade implements Serializable {

    @Id
    @Column(name = "ID_XXX", nullable = false)
    @GeneratedValue(generator = "SEQ_SEL_XXX", strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(name = "TXT_NOME_CAMPO")
    private String nomeCampo;

    @Column(name = "DAT_MOVTO")
    private LocalDate dataMovimento;
}
```

**Regras:**
- Prefixo de tabela: `SEL_` seguido de sigla do módulo
- Colunas com prefixos semânticos: `TXT_` (texto), `DAT_` (data), `NUM_` (número), `IND_` (indicador), `VAL_` (valor), `BIN_` (binário), `COD_` (código)
- Usar `@Getter` e `@Setter` do Lombok (não `@Data` para entidades JPA)
- Implementar `Serializable`
- Usar `LocalDate` e `LocalDateTime` para datas

### 4.2 DTOs

```java
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
@Setter
public class NomeDTO {
    private String campo;
    private LocalDate data;
}
```

### 4.3 Serviços de Aplicação

```java
@RequiredArgsConstructor
@Service
@Slf4j
public class NomeServico {

    private final RepositorioX repositorioX;
    private final ClienteY clienteY;

    @Transactional(readOnly = true)
    public List<Entidade> consultarDados() {
        // implementação
    }

    @Transactional
    public void salvarDados(EntidadeDTO dto) {
        // implementação
    }
}
```

### 4.4 Repositórios

```java
@Repository
public interface NomeRepository extends JpaRepository<Entidade, Long> {

    @Query("SELECT e FROM Entidade e WHERE e.dataMovimento = :data")
    List<Entidade> buscarPorData(@Param("data") LocalDate data);

    @EntityGraph("EntidadeGraph.withChildren")
    Optional<Entidade> findByNumeroAndDataMovimento(String numero, LocalDate data);
}
```

### 4.5 Exceções Customizadas

```java
public class NomeException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    public NomeException(String mensagem) {
        super(mensagem);
    }

    public NomeException(String mensagem, Throwable causa) {
        super(mensagem, causa);
    }
}
```

---

## 5. APIs REST

### 5.1 Padrão Interface + Controller

**Interface (Contrato):**
```java
@RequestMapping("${api.path}/v1/recurso")
@Tag(name = "Recurso", description = "Descrição da API")
@ApiResponses({
    @ApiResponse(responseCode = "400", description = ConstantesStatusAPI.BAD_REQUEST_MESSAGE),
    @ApiResponse(responseCode = "401", description = ConstantesStatusAPI.UNAUTHORIZED),
    @ApiResponse(responseCode = "403", description = ConstantesStatusAPI.FORBIDDEN_MESSAGE),
    @ApiResponse(responseCode = "404", description = ConstantesStatusAPI.NOT_FOUND_MESSAGE),
    @ApiResponse(responseCode = "500", description = ConstantesStatusAPI.INTERNAL_SERVER_ERROR)
})
public interface RecursoAPI {

    @Operation(summary = "Descrição da operação")
    @ApiResponse(responseCode = "200", description = ConstantesStatusAPI.OK_MESSAGE)
    @Secured("SELIC.PERMISSAO_ESPECIFICA")
    @GetMapping("/endpoint")
    ResponseEntity<TipoRetorno> metodo(
        @Parameter(description = "Descrição do parâmetro") @RequestParam String parametro
    );
}
```

**Controller (Implementação):**
```java
@RequiredArgsConstructor
@RestController
public class RecursoController implements RecursoAPI {

    private final ServicoRecurso servico;

    @Override
    public ResponseEntity<TipoRetorno> metodo(String parametro) {
        return ResponseEntity.of(Optional.ofNullable(servico.executar(parametro)));
    }
}
```

### 5.2 Feign Clients

```java
@FeignClient(
    value = "nomeClient", 
    url = "${servico.externo.url}",
    configuration = APIFeignConfiguration.class
)
public interface ServicoExternoClient {

    @GetMapping("/endpoint")
    ResponseDTO consultar(@RequestParam String param);
}
```

---

## 6. Segurança

### 6.1 OAuth2/OIDC

```java
@Configuration
public class APISecurityConfig extends RestAPISecurityConfig {

    @Override
    protected Stream<String> getUnsecuredUrl() {
        return Stream.concat(
            Stream.of("/swagger-ui.html", "/rest/aplicacao/versao"),
            super.getUnsecuredUrl()
        );
    }
}
```

### 6.2 Regras

- Autenticação OAuth2/JWT via RHSSO (Keycloak)
- Autorização via roles: `@Secured("SELIC.NOME_PERMISSAO")`
- Credenciais criptografadas com Jasypt
- Nunca expor senhas ou tokens em logs

### 6.3 Propriedades Sensíveis

```properties
spring.datasource.password=${PROP_BD_PASSWORD}
spring.security.oauth2.client.registration.xxx.client-secret=${PROP_RHSSO_SECRET}
```

---

## 6A. OWASP Top 10

O projeto segue as diretrizes do [OWASP Top 10 (2021)](https://owasp.org/Top10/) para segurança de aplicações:

### 6A.1 A01 - Broken Access Control

**Mitigações Implementadas:**

```java
// ✅ Usar @Secured em TODOS os endpoints
@Secured("SELIC.CONSULTAR_OPERACAO")
@GetMapping("/operacao/{id}")
public ResponseEntity<Operacao> consultar(@PathVariable Long id) {
    // Validar se usuário tem acesso ao recurso específico
    validarAcessoOperacao(id);
    return ResponseEntity.ok(servico.consultar(id));
}

// ✅ Verificação de ownership no serviço
public Operacao consultar(Long id) {
    Operacao op = repository.findById(id)
        .orElseThrow(() -> new RecursoNaoEncontradoException("Operação não encontrada"));
    
    // Valida se usuário logado tem acesso
    if (!securityService.usuarioPodeAcessar(op.getParticipante())) {
        throw new AcessoNegadoException("Acesso negado a esta operação");
    }
    return op;
}
```

**Regras:**
- Negar por padrão (deny by default)
- Validar acesso no nível de recurso, não apenas endpoint
- Log de tentativas de acesso não autorizado

### 6A.2 A02 - Cryptographic Failures

**Mitigações Implementadas:**

```java
// ✅ Usar Jasypt para criptografia de propriedades
@Value("${datasource.password}")
private String passwordCriptografado; // ENC(xxx) descriptografado pelo Jasypt

// ✅ HTTPS obrigatório em todos os ambientes
// application.yml
server:
  ssl:
    enabled: true
    
// ✅ Nunca logar dados sensíveis
log.info("Processando operação: {}", operacao.getNumero()); // OK
log.info("Token: {}", token); // ❌ NUNCA
```

**Regras:**
- TLS 1.3 obrigatório para comunicação
- Senhas NUNCA em texto plano
- Dados sensíveis criptografados em repouso

### 6A.3 A03 - Injection

**Mitigações Implementadas:**

```java
// ✅ BOM: Usar parâmetros nomeados com JPA
@Query("SELECT o FROM Operacao o WHERE o.numero = :numero")
Optional<Operacao> findByNumero(@Param("numero") String numero);

// ❌ NUNCA: Concatenação SQL
@Query("SELECT o FROM Operacao o WHERE o.numero = '" + numero + "'") // VULNERÁVEL!

// ✅ BOM: Validação de entrada
@Pattern(regexp = "^[A-Z0-9]{10}$")
private String numeroOperacao;
```

**Regras:**
- Sempre usar PreparedStatement ou JPA com parâmetros
- Validar e sanitizar todas as entradas
- Usar Bean Validation (@Valid, @Pattern, etc.)

### 6A.4 A04 - Insecure Design

**Mitigações Implementadas:**
- Threat modeling em features críticas
- Design review mandatório para funcionalidades sensíveis
- Limite de tentativas de login
- Rate limiting em APIs públicas

### 6A.5 A05 - Security Misconfiguration

```java
// ✅ Desabilitar endpoints de debug em produção
@Profile("!pro")
@RestController
public class DebugController { ... }

// ✅ Headers de segurança
@Configuration
public class SecurityHeadersConfig {
    @Bean
    public FilterRegistrationBean<SecurityHeadersFilter> securityHeaders() {
        // X-Content-Type-Options, X-Frame-Options, etc.
    }
}
```

### 6A.6 A06 - Vulnerable and Outdated Components

**Regras:**
- Executar `mvn dependency-check:check` no build
- Atualizar dependências com CVEs conhecidas em até 30 dias
- Usar versões LTS do Java (21 ou 25)
- Manter Spring Boot na última versão estável

### 6A.7 A07 - Identification and Authentication Failures

```java
// ✅ Tokens JWT com expiração curta
private static final long JWT_EXPIRATION = 15 * 60 * 1000; // 15 minutos

// ✅ Refresh tokens com rotação
@PostMapping("/refresh")
public ResponseEntity<TokenResponse> refresh(@RequestBody RefreshRequest request) {
    // Invalida refresh token antigo, emite novo
}

// ✅ Logout efetivo
@PostMapping("/logout")
public ResponseEntity<Void> logout() {
    // Adicionar token à blocklist
    tokenBlocklistService.add(getCurrentToken());
    return ResponseEntity.noContent().build();
}
```

### 6A.8 A08 - Software and Data Integrity Failures

**Regras:**
- Verificar assinaturas de dependências
- CI/CD pipeline seguro
- Validar integridade de arquivos importados

### 6A.9 A09 - Security Logging and Monitoring Failures

```java
// ✅ Log de eventos de segurança
@Aspect
@Component
public class SecurityAuditAspect {
    
    @AfterThrowing(pointcut = "@annotation(Secured)", throwing = "ex")
    public void logAccessDenied(JoinPoint jp, AccessDeniedException ex) {
        auditLog.warn("ACESSO_NEGADO: usuario={}, recurso={}, ip={}",
            getCurrentUser(), jp.getSignature(), getClientIp());
    }
}
```

### 6A.10 A10 - Server-Side Request Forgery (SSRF)

```java
// ✅ Validar URLs antes de fazer requisições
public void fetchExternal(String url) {
    if (!urlValidator.isAllowed(url)) {
        throw new SecurityException("URL não permitida");
    }
    // Prosseguir com requisição
}

// ✅ Whitelist de domínios permitidos
private static final Set<String> ALLOWED_DOMAINS = Set.of(
    "api.bcb.gov.br",
    "selic-interno.bcb.gov.br"
);
```

---

## 6B. RBAC (Role-Based Access Control)

### 6B.1 Estrutura de Roles

```
Roles SELIC:
├── SELIC.ADMIN                    # Administrador do sistema
│   ├── SELIC.OPERADOR             # Operador geral
│   │   ├── SELIC.CONSULTA         # Apenas consulta
│   │   └── SELIC.SUPORTE          # Suporte técnico
│   └── SELIC.AUDITOR              # Auditor (somente leitura)
└── SELIC.SISTEMA                  # Conta de serviço
```

### 6B.2 Configuração Spring Security

```java
@Configuration
@EnableMethodSecurity(securedEnabled = true, prePostEnabled = true)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter()))
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**").permitAll()
                .anyRequest().authenticated()
            )
            .build();
    }
    
    @Bean
    public JwtAuthenticationConverter jwtAuthConverter() {
        var converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            // Extrair roles do token RHSSO
            var roles = jwt.getClaimAsStringList("roles");
            return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role))
                .collect(Collectors.toList());
        });
        return converter;
    }
}
```

### 6B.3 Padrões de Anotação

```java
// ✅ @Secured - Para roles simples
@Secured("SELIC.CONSULTAR_OPERACAO")
@GetMapping("/operacao")
public ResponseEntity<List<Operacao>> listar() { ... }

// ✅ @PreAuthorize - Para expressões complexas
@PreAuthorize("hasRole('SELIC.ADMIN') or @securityService.isOwner(#id)")
@DeleteMapping("/operacao/{id}")
public ResponseEntity<Void> excluir(@PathVariable Long id) { ... }

// ✅ @PostAuthorize - Validação após execução
@PostAuthorize("returnObject.participante == authentication.principal.participante")
@GetMapping("/operacao/{id}")
public Operacao consultar(@PathVariable Long id) { ... }
```

### 6B.4 Integração RHSSO (Keycloak)

```yaml
# application.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: ${RHSSO_ISSUER_URI}
          jwk-set-uri: ${RHSSO_JWK_SET_URI}
```

### 6B.5 Auditoria de Acesso

```java
@Component
public class RBACauditService {
    
    @EventListener
    public void onAuthenticationSuccess(AuthenticationSuccessEvent event) {
        auditLog.info("LOGIN_SUCESSO: usuario={}, roles={}",
            event.getAuthentication().getName(),
            event.getAuthentication().getAuthorities());
    }
    
    @EventListener  
    public void onAccessDenied(AuthorizationDeniedEvent event) {
        auditLog.warn("ACESSO_NEGADO: usuario={}, recurso={}",
            event.getAuthentication().getName(),
            event.getSource());
    }
}
```

---

## 7. Banco de Dados

### 7.1 Liquibase

```
src/main/resources/db/
├── master-changelog.yaml
└── migrations/
    └── {versao}/
        └── xxxx_descricao.yaml
```

### 7.2 Nomenclatura

- Tabelas: `SEL_{MODULO}_{NOME}`
- Sequences: `SEQ_SEL_{MODULO}_{NOME}`
- Índices: `IDX_{TABELA}_{COLUNAS}`
- Foreign Keys: `FK_{TABELA_ORIGEM}_{TABELA_DESTINO}`

### 7.3 Scripts DDL

```
database/
├── ddl.sql
├── ddl-drop.sql
├── dml.sql
├── local/
├── des/
└── cer/
```

---

## 8. Testes

### 8.1 Estrutura

```java
class ServicoTesteTest {

    @Mock
    private RepositorioMock repositorioMock;

    @InjectMocks
    private ServicoTeste servico;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void nomeMetodo_cenario_resultadoEsperado() {
        // Arrange
        when(repositorioMock.buscar(any())).thenReturn(resultadoEsperado);

        // Act
        var resultado = servico.executar();

        // Assert
        assertNotNull(resultado);
        assertEquals(esperado, resultado);
        verify(repositorioMock, times(1)).buscar(any());
    }
}
```

### 8.2 ArchUnit

```java
@AnalyzeClasses(packages = "br.gov.bcb.demab.dicel.selic.modulo..")
public class ValidarArquitetura {

    @ArchTest
    private static final ArchRules REGRAS_DDD = ArchRules.in(RegrasDDD.class);

    @ArchTest
    private static final ArchRules REGRAS_NOMECLATURA = ArchRules.in(RegrasNomeclatura.class);
}
```

---

## 9. CI/CD

### 9.1 Pipeline Jenkins

```groovy
@Library('selic-pipeline@3.0.x') _

pipelineCI(
    pomFile: "pom.xml",
    branches: ['develop', 'release', 'master'],
    sonarInstance: "SonarDev",
    mavenGoals: "deploy",
    jdkVersion: 21
)
```

### 9.2 Ambientes

| Ambiente | Propósito |
|----------|-----------|
| local | Desenvolvimento local |
| des | Desenvolvimento integrado |
| cer | Certificação |
| qa | Quality Assurance |
| tau | Testes de aceite |
| tnf | Testes não funcionais |
| tsi | Testes de integração |
| hml | Homologação |
| pro | Produção |

---

## 10. Qualidade de Código

### 10.1 SonarQube

```xml
<properties>
    <sonar.binaries>target/classes</sonar.binaries>
    <sonar.coverage.jacoco.xmlReportPaths>target/site/jacoco/jacoco.xml</sonar.coverage.jacoco.xmlReportPaths>
</properties>
```

### 10.2 JaCoCo

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
</plugin>
```

---

## 11. Boas Práticas

### 11.1 Clean Code

- Métodos pequenos e com responsabilidade única
- Nomes descritivos em português (domínio) ou inglês (código técnico)
- Evitar comentários óbvios - código auto-explicativo
- Máximo de 3 níveis de indentação
- Evitar valores mágicos - usar constantes

**Exemplo - Método focado e legível:**
```java
// ✅ BOM: Método pequeno, nome descritivo, responsabilidade única
public List<Operacao> recuperarOperacoesExpiraveis() {
    LocalDate dataMovimento = obterDataMovimentoCorrente();
    LocalDateTime limiteExpiracao = calcularLimiteExpiracao();
    
    return operacaoRepository.buscarPendentesPorLimite(dataMovimento, limiteExpiracao);
}

// ❌ RUIM: Método faz muitas coisas, nome genérico
public List<Operacao> processar() {
    // 200 linhas de código fazendo múltiplas operações...
}
```

### 11.2 DRY

- Extrair código duplicado para métodos/classes reutilizáveis
- Usar bibliotecas comuns (`selic-utils`, `selic-cadastro-api-client`)
- Centralizar constantes e configurações

**Exemplo - Reutilização via bibliotecas:**
```java
// ✅ BOM: Usa biblioteca comum para formatação
import static br.gov.bcb.dicel.selic.utils.FormatadorSelic.*;

String contaFormatada = formatarContaSelic(numeroConta);

// ❌ RUIM: Duplica lógica de formatação em cada serviço
String contaFormatada = numeroConta.substring(0,2) + "-" + numeroConta.substring(2,6) + "...";
```

### 11.3 SOLID

- **S** (Single Responsibility): Cada classe deve ter uma única responsabilidade
- **O** (Open/Closed): Aberto para extensão, fechado para modificação
- **L** (Liskov Substitution): Subtipos devem ser substituíveis por seus tipos base
- **I** (Interface Segregation): Interfaces específicas ao invés de interfaces genéricas
- **D** (Dependency Inversion): Depender de abstrações, não de implementações

**Exemplo - Dependency Inversion no projeto:**
```java
// ✅ BOM: Serviço depende de interface (abstração)
@RequiredArgsConstructor
@Service
public class ServicoOperacao {
    private final OperacaoRepository repository;        // Interface
    private final CicloVidaClient cicloVidaClient;      // Interface Feign
}

// A implementação real é injetada pelo Spring
// Pode ser facilmente mockada em testes
```

### 11.4 Clean Architecture

A Clean Architecture no projeto SELIC segue estas regras:

**Regra de Dependência:**
```
interfaces → aplicacao → dominio ← infraestrutura
```

As dependências SEMPRE apontam para o centro (domínio). Camadas externas conhecem as internas, nunca o contrário.

**Estrutura das Camadas:**

| Camada | Responsabilidade | Depende de |
|--------|------------------|------------|
| `interfaces/` | Receber requisições, converter dados | `aplicacao`, `dominio` |
| `aplicacao/` | Orquestrar casos de uso | `dominio` |
| `dominio/` | Regras de negócio, entidades | Nenhuma |
| `infraestrutura/` | Configurações técnicas | `dominio` |

**Exemplo - Fluxo de uma requisição:**
```
1. Controller (interfaces/) recebe requisição HTTP
   └── Delega para ServicoOperacao

2. ServicoOperacao (aplicacao/) orquestra o caso de uso
   ├── Chama GradeAPIClient para obter data movimento
   ├── Chama ConfiguracaoClient para obter parâmetros
   └── Chama OperacaoRepository para buscar dados

3. OperacaoRepository (dominio/) - Interface
   └── Implementação real injetada pelo Spring (JPA)

4. Operacao (dominio/entidade/) processa regras de negócio
   └── operacao.preencherAtributosAgregados()

5. Controller retorna ResponseEntity com resultado
```

**Exemplo - O que cada camada contém:**

```java
// DOMÍNIO - Entidade com comportamento (regra de negócio)
@Entity
public class Operacao {
    @Transient
    private String chaveAssociacaoCedente;
    
    // Regra de negócio na entidade
    public void preencherAtributosAgregados() {
        this.comandos.stream()
            .filter(ComandoOperacao::isCedente)
            .findFirst()
            .ifPresent(cmd -> this.chaveAssociacaoCedente = cmd.getChaveOperacaoAssociada());
    }
}

// DOMÍNIO - Repository é apenas interface
@Repository
public interface OperacaoRepository extends JpaRepository<Operacao, Long> {
    List<Operacao> findByDataMovimento(LocalDate data);
}

// DOMÍNIO - Client é apenas interface (contrato)
@FeignClient(value = "cicloVidaClient", url = "${selic.ciclo-vida.url}")
public interface CicloVidaClient {
    @GetMapping("/selic/fechado")
    Boolean verificarSelicFechado(@RequestParam String siglaSistema);
}

// APLICAÇÃO - Serviço orquestra, não implementa regras
@Service
@RequiredArgsConstructor
public class ServicoOperacao {
    private final OperacaoRepository repository;
    private final CicloVidaClient cicloVidaClient;
    
    public List<Operacao> recuperarOperacoes() {
        var operacoes = repository.findByDataMovimento(LocalDate.now());
        operacoes.forEach(Operacao::preencherAtributosAgregados);  // Entidade faz o trabalho
        return operacoes;
    }
}

// INTERFACES - Controller é fino, apenas delega
@RestController
@RequiredArgsConstructor
public class OperacaoController implements OperacaoAPI {
    private final ServicoOperacao servico;
    
    @Override
    public ResponseEntity<List<Operacao>> listar() {
        return ResponseEntity.ok(servico.recuperarOperacoes());
    }
}
```

**Anti-patterns a evitar:**

```java
// ❌ RUIM: Controller com lógica de negócio
@RestController
public class OperacaoController {
    @GetMapping
    public ResponseEntity<List<Operacao>> listar() {
        var ops = repository.findAll();
        ops.forEach(op -> {
            // Lógica de negócio no controller!
            if (op.getSituacao().equals("PEN")) {
                op.setAlerta(true);
            }
        });
        return ResponseEntity.ok(ops);
    }
}

// ❌ RUIM: Domínio importando de infraestrutura
package br.gov.bcb.demab.dicel.selic.operacao.dominio.entidade;
import br.gov.bcb.demab.dicel.selic.operacao.infraestrutura.config.AppConfig; // ERRADO!

// ❌ RUIM: Entidade anêmica (sem comportamento)
@Entity
public class Operacao {
    private String numero;
    private LocalDate data;
    // Apenas getters e setters, sem métodos de negócio
}
```

---

## 12. Checklist de Revisão

- [ ] Estrutura de pacotes segue Clean Architecture (DDD)
- [ ] Regra de dependência respeitada (interfaces → aplicação → domínio)
- [ ] Controllers são finos (delegam para serviços)
- [ ] Serviços de aplicação orquestram, não implementam regras de negócio
- [ ] Entidades são ricas (contêm comportamento do domínio)
- [ ] Interfaces de API separadas de implementação
- [ ] Testes unitários escritos e passando
- [ ] Cobertura de código adequada
- [ ] Documentação OpenAPI atualizada
- [ ] Validação de arquitetura (ArchUnit) passando
- [ ] Sem credenciais hardcoded
- [ ] ConfigMaps atualizados para todos os ambientes
- [ ] Migrations de banco versionadas
