# ADR 0016: Sanitização e validação de entrada em duas camadas, sempre nesta ordem

## Status

Aceito — 2026-09-07

## Contexto

Toda entrada de usuário na API chega por DTOs de rotas HTTP. `docs/security.md` documenta duas camadas globais aplicadas a essa entrada, nesta ordem fixa: um `SanitizeStringsPipe` customizado, seguido do `ValidationPipe` do `class-validator` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`). Essa ordem — sanitizar antes de validar — é uma decisão estrutural que atravessa toda rota da aplicação, mas hoje só existe como uma lista de bullets em `docs/security.md`, sem o raciocínio de por que essa ordem específica (e não a inversa, ou uma única camada) foi escolhida.

## Decisão

Aplicar globalmente, nesta ordem, para toda rota HTTP:

1. **`SanitizeStringsPipe`**: sanitiza strings nos DTOs de entrada antes de qualquer outra validação.
2. **`ValidationPipe`** (`class-validator`/`class-transformer`): com `whitelist: true` (descarta campos não declarados no DTO), `forbidNonWhitelisted: true` (rejeita a requisição se houver campo extra, em vez de silenciosamente ignorá-lo) e `transform: true` (converte o payload para a instância tipada do DTO).

Sanitizar **antes** de validar garante que as regras de validação (`class-validator`) operam sobre o valor já normalizado — evitando que um valor com caracteres de controle ou espaços indevidos escape de uma regra de formato por estar "sujo" no momento da checagem.

## Alternativas consideradas

### Validar primeiro, sanitizar depois

Inverteria a ordem atual. Descartada porque uma regra de validação (ex.: regex de formato, comprimento) rodaria sobre a entrada ainda não normalizada — um valor poderia falhar ou passar por validação de forma inconsistente dependendo de caracteres que a sanitização removeria de qualquer forma, tornando o comportamento de validação dependente de detalhes de encoding que o usuário não controla conscientemente.

### Sanitização e validação numa única camada customizada

Substituiria as duas camadas por um único pipe que fizesse as duas coisas. Descartada porque o `class-validator`/`class-transformer` já é um padrão maduro e amplamente testado do ecossistema NestJS para validação declarativa via decorators nos DTOs — reimplementar validação dentro de uma camada de sanitização customizada duplicaria esforço e perderia a legibilidade dos decorators (`@IsString()`, `@IsEmail()`, etc.) diretamente nos DTOs.

### `forbidNonWhitelisted: false` (apenas descartar campos extras, sem rejeitar a requisição)

Seria mais tolerante a payloads com campos adicionais não previstos. Descartado porque descartar silenciosamente um campo extra pode mascarar um erro de integração do cliente (um campo com nome ligeiramente diferente do esperado simplesmente desaparece, sem aviso) — rejeitar explicitamente torna esse tipo de erro visível imediatamente, no momento da integração, em vez de like um bug silencioso mais tarde.

## Consequências

### Positivas

- **Defesa em profundidade contra injeção de payload malformado**: a combinação de sanitização + validação estrita cobre tanto a normalização quanto a conformidade estrutural do payload, em uma única passagem global, sem exigir que cada rota reimplemente essa lógica.
- **Erros de integração de cliente detectados cedo**: `forbidNonWhitelisted: true` transforma um campo extra inesperado num erro imediato e explícito, não numa perda silenciosa de dado.
- **Aplicada globalmente, nunca opcional por rota**: nenhuma rota pode "esquecer" de aplicar essas proteções, pois são pipes globais registrados uma única vez na composição da aplicação.

### Negativas / Trade-offs

- **Rigidez para clientes que enviam campos extras por engano**: um cliente HTTP com um payload levemente fora do contrato (ex.: um campo de debug esquecido) recebe erro em vez de ser silenciosamente tolerado — correto para este projeto, mas exige que integrações externas sigam o contrato exato do DTO.
- **Acoplamento à ordem de registro dos pipes**: a garantia de "sanitiza antes de validar" depende da ordem em que os pipes globais são registrados na composição da aplicação (`configureApp()`) — inverter essa ordem por engano numa refatoração futura reintroduziria o problema que esta decisão evita, sem que nenhum teste hoje afirme a ordem explicitamente.

### Riscos mitigados

- **Bypass de regra de validação via caractere não normalizado**: mitigado por sanitizar antes de validar.
- **Payload com campo inesperado sendo aceito e ignorado silenciosamente**: mitigado por `forbidNonWhitelisted: true`.

## Referências

- [`docs/security.md`](../security.md) — lista de mitigações de segurança no código.
- [ADR 0004 — Autenticação de clientes](0004-autenticacao-de-clientes.md) — outro ponto de entrada de dado sensível (CPF) que passa pelas mesmas duas camadas.
