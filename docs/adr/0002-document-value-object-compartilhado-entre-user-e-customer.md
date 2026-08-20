# ADR 0002: Generalização do Value Object `Document` para uso compartilhado entre `User` e `Customer`

## Status

Aceito — 2026-08-19

## Contexto

O cadastro de usuário (`User`) precisa passar a exigir CPF ou CNPJ, com a mesma validação e forma de armazenamento já usadas no cadastro de clientes (`Customer`), e o login precisa aceitar tanto e-mail quanto esse documento como identificador.

O domínio já possui um Value Object `Document` (`domain/value-objects/document.vo.ts`) que sanitiza o valor e valida CPF/CNPJ via `DocumentValidator` — uma classe já agnóstica de entidade, que roteia por tamanho (11 dígitos → CPF, 14 → CNPJ) e roda o algoritmo de dígito verificador completo para os dois formatos.

O obstáculo para reaproveitar esse VO em `User` era um acoplamento acidental: `Document.create(value, type)` exige um `CustomerType`, enum que pertence ao bounded context de `Customer` e é usado em ~30 pontos do código (filtros de listagem, responses de stock, work-order e customer). Fazer `User` depender de `CustomerType` inverteria a dependência na direção errada — um conceito específico de um agregado (`Customer`) vazando para outro (`User`).

A documentação de arquitetura (`docs/architecture.md`) já descreve `domain/` como um único shared kernel — `value-objects/` lista `Document (CPF/CNPJ)` e `enums/` lista os enums do domínio lado a lado, sem separação por bounded context. Não havia, portanto, uma barreira arquitetural real entre `User` e `Customer` — apenas um acoplamento de implementação a corrigir.

## Decisão

1. Extrair um enum genérico `DocumentType` (`INDIVIDUAL` | `COMPANY`) no shared kernel do domínio, representando o conceito real: "que tipo de pessoa este documento identifica" — um conceito que pertence ao `Document`, não ao `Customer`.
2. `CustomerType` passa a ser um **re-export** de `DocumentType` (`export { DocumentType as CustomerType } from './document-type.enum'`), preservando nome, caminho de import e valores — nenhum dos ~30 call sites de `CustomerType` é alterado.
3. `Document.create(value, type?)` — o parâmetro `type` vira opcional. Quando informado (fluxo de `Customer`, inalterado), valida que o valor bate com o tipo esperado. Quando omitido (fluxo de `User`), o VO autodetecta o tipo pelo tamanho do valor sanitizado antes de rodar a mesma validação de dígito verificador.
4. `User.document` passa a ser `Document` (Value Object), não uma string solta — alinhando com o padrão já existente do VO `Email`, hoje compartilhado por `User` e `Customer`.

## Alternativas consideradas

### A — Campo `document: string` solto em `User`, validado inline com `DocumentValidator.validateCpfCnpj`
Menor diff imediato e zero risco ao código de `Customer`. Descartada como decisão final porque duplica a responsabilidade de "o que é um documento válido" em dois lugares (o VO `Document` para `Customer`, uma checagem solta em `User`) — dois pontos de manutenção que podem divergir com o tempo, e uma assimetria de modelagem em relação ao VO `Email`, que já é compartilhado sem essa duplicação.

### B — Duplicar a lógica em um VO próprio (`UserDocument`)
Descartada: o `DocumentValidator` de baixo nível já é agnóstico de entidade — duplicá-lo (ou envolvê-lo num segundo VO) violaria DRY sem nenhum ganho, já que não há necessidade real de comportamento diferente entre os dois VOs.

### C — Renomear/mover `CustomerType` para o novo local, sem enum próprio de `Document`
Rejeitada por acoplar o nome do conceito de domínio (`DocumentType`) ao nome de um agregado específico (`Customer`), mesmo depois de generalizado — o re-export mantém a compatibilidade de nome onde ele já é usado (`Customer`) sem forçar essa mesma nomenclatura sobre `User`.

## Consequências

### Positivas
- Fonte única de verdade para "o que é um CPF/CNPJ válido", garantida na construção do Value Object — sem checagens duplicadas.
- Consistência de modelagem de domínio: `User` e `Customer` compartilham os mesmos VOs (`Email`, agora também `Document`) para dados que seguem as mesmas regras de validação.
- Direção de dependência corrigida: o VO genérico do shared kernel não depende mais de um enum específico de um agregado.
- Retrocompatibilidade total: nenhum dos ~30 call sites de `CustomerType` muda, e todos os testes existentes de `Document` (que sempre passam `type` explicitamente) continuam passando sem alteração.

### Negativas / Trade-offs
- `Document.create` com assinatura de `type` opcional é discretamente menos explícito no call site de `User` (o autor da chamada precisa saber que a ausência de `type` significa autodetecção) — mitigado por um comentário no próprio método `detectType`.
- `CustomerType` como re-export de `DocumentType` é uma indireção a mais para quem lê `customer-type.enum.ts` pela primeira vez — mitigado por manter o arquivo pequeno e o re-export explícito (não um `import * as` opaco).

### Riscos mitigados
- **Regressão em `Customer`**: mitigada por manter a assinatura e o comportamento de `Document.create(value, type)` idênticos quando `type` é informado, e por rodar a suíte de testes existente de `Customer`/`Document` sem alterações antes de mesclar.
- **Confusão entre "tipo de cliente" e "tipo de documento"**: são, de fato, o mesmo conceito de domínio (pessoa física vs. jurídica) hoje — a decisão assume essa equivalência; se um dia `CustomerType` precisar carregar semântica adicional que não se aplique a `DocumentType` (ou vice-versa), os dois enums devem ser desacoplados (removendo o re-export).

## Referências

- `docs/architecture.md` — seção "DDD — Aggregate Roots, Entidades e Value Objects".
- `docs/superpowers/specs/2026-08-19-user-document-login-design.md` — spec da feature que motivou esta decisão.
