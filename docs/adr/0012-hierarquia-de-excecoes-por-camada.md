# ADR 0012: Hierarquia de exceções por camada, com Exception Filters dedicados

## Status

Aceito — 2026-09-07

## Contexto

`domain/` e `application/` são livres de framework HTTP (ver [ADR 0009](0009-clean-architecture-ddd-em-camadas.md)) — não podem lançar `HttpException` do NestJS nem conhecer códigos de status HTTP diretamente, sob pena de vazar um conceito de transporte para dentro de camadas que precisam permanecer testáveis e reutilizáveis independentemente de a aplicação ser exposta por HTTP, mensageria ou CLI. Ainda assim, o sistema precisa devolver o status HTTP correto (400, 401, 404, 409, 422, 503...) para cada tipo de falha, de forma consistente em toda a API.

## Decisão

Cada camada define sua **própria hierarquia de exceções**, sem depender de HTTP:

| Camada | Exceção | HTTP |
|---|---|---|
| Domain | `DomainValidationException` | 422 |
| Domain | `EntityNotFoundException` | 404 |
| Domain | `BusinessRuleViolationException` | 409 |
| Application | `ResourceNotFoundException` | 404 |
| Application | `ResourceConflictException` | 409 |
| Application | `UnauthorizedAccessException` | 401 |
| Infrastructure | `AuthenticationFailedException` | 401 |
| Infrastructure | `ConcurrencyException` | 409 |
| Infrastructure | `DatabaseOperationException` | 503 |
| Infrastructure | `ServiceIntegrationException` | 503 |

O mapeamento para status HTTP acontece **exclusivamente** nos Exception Filters (`DomainExceptionFilter`, `ApplicationExceptionFilter`, `InfrastructureExceptionFilter`, `AllExceptionsFilter`), registrados como `APP_FILTER` em `app.module.ts` — a única camada do sistema que sabe traduzir "tipo de exceção" para "código HTTP". Erros de validação de DTO são cobertos pelo `ValidationPipe` global (400); exceções não mapeadas por nenhum filtro caem no `AllExceptionsFilter` e viram 500.

## Alternativas consideradas

### Uma única hierarquia de exceções compartilhada por todas as camadas

`domain/` e `application/` lançariam subclasses da mesma exceção base, com o status HTTP como propriedade. Descartado porque exigiria que o domínio conhecesse a ideia de "status HTTP" (ainda que só como um número numa propriedade), acoplando uma camada livre de framework a um conceito de transporte — e tornaria mais difícil distinguir "isto é uma violação de invariante de domínio" de "isto é um conflito de recurso ao persistir", que hoje são tipos diferentes por design.

### Lançar `HttpException` do NestJS diretamente do domínio/aplicação

Seria a forma mais direta de obter o status HTTP correto, sem indireção. Descartada porque importar `@nestjs/common` dentro de `domain/` ou `application/` é bloqueado pela cerca de ESLint (ver ADR 0009) — tornaria essas camadas explicitamente dependentes do NestJS, quebrando a premissa de que podem ser testadas e reutilizadas sem o framework web.

### Um único Exception Filter genérico, com um `switch` sobre o tipo de exceção

Um único filtro central inspecionaria o tipo da exceção lançada e decidiria o status, em vez de um filtro por camada. Descartado porque misturaria num só lugar o conhecimento de exceções de três camadas diferentes — cada filtro dedicado (`DomainExceptionFilter`, etc.) só precisa conhecer a hierarquia da sua própria camada, o que mantém cada um pequeno e o `switch`/`instanceof` local a cada tipo de origem.

## Consequências

### Positivas

- **Camadas internas permanecem testáveis sem HTTP**: um teste unitário de caso de uso verifica `expect(...).rejects.toThrow(ResourceNotFoundException)` sem nunca importar NestJS.
- **Status HTTP consistente e centralizado**: qualquer mudança em "que status um tipo de exceção deve produzir" acontece em um dos quatro filtros, nunca espalhada por controllers individuais.
- **Origem da falha é auditável pelo tipo da exceção**: o mesmo HTTP 409 pode vir de `BusinessRuleViolationException` (domain), `ResourceConflictException` (application) ou `ConcurrencyException` (infrastructure) — o log registra o tipo real, não só o status, permitindo diferenciar as causas em observabilidade sem expor essa distinção ao cliente da API.

### Negativas / Trade-offs

- **Múltiplos tipos de exceção mapeiam para o mesmo status HTTP**: `BusinessRuleViolationException`, `ResourceConflictException` e `ConcurrencyException` são todos 409 — um cliente da API só vê "409 Conflict" nos três casos, tendo que ler a mensagem para diferenciar a causa real (regra de negócio violada vs. recurso duplicado vs. escrita concorrente).
- **Quatro filtros para manter em vez de um**: adicionar uma nova exceção exige decidir em qual camada ela pertence e adicionar o mapeamento no filtro correspondente — mais pontos de mudança do que um único filtro central, em troca do isolamento por camada.

### Riscos mitigados

- **Vazamento de detalhe de infraestrutura/stack trace ao cliente**: mitigado por todo filtro devolver uma mensagem de erro controlada, nunca a exceção original ou seu stack trace.
- **Domínio acoplado ao transporte HTTP**: mitigado pela regra de dependência da Clean Architecture (ADR 0009) e pela cerca de ESLint que a torna estruturalmente impossível de violar sem quebrar a build.

## Referências

- [`docs/architecture.md` › Exceções por Camada](../architecture.md#exceções-por-camada)
- [ADR 0009 — Clean Architecture e DDD em camadas](0009-clean-architecture-ddd-em-camadas.md)
