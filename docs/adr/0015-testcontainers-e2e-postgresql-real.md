# ADR 0015: Testes E2E contra PostgreSQL real via Testcontainers, não mocks

## Status

Aceito — 2026-09-07

## Contexto

A suíte E2E (`docs/testing.md`) cobre 15 domínios de negócio mais `me`, o `AllExceptionsFilter`, logging estruturado, health endpoints e telemetria. Vários comportamentos que essa suíte precisa validar dependem diretamente do banco de dados real, não da camada de aplicação: constraints de unicidade, cascade deletes, sequences, conversões de tipo, índices, e — o caso mais crítico — a corrida implícita de updates condicionados (`WHERE version = ?`) que sustenta a concorrência otimista (ADR 0010). Nenhum desses comportamentos é reproduzível de forma fiel com um mock do Prisma Client.

## Decisão

Rodar toda a suíte E2E contra um **PostgreSQL real, provisionado via Testcontainers** (`test/jest-e2e.json`, timeout de 10 minutos para acomodar a inicialização do container), em vez de mockar a camada de persistência. Helpers compartilhados em `test/helpers/` (`test-app.helper.ts`, `auth.helper.ts`, `db-cleanup.helper.ts`) sobem o `INestApplication` via `configureApp()` — a mesma composição usada por `main.ts` —, autenticam e limpam o banco entre testes.

## Alternativas consideradas

### Mockar o Prisma Client nos testes E2E

Seria mais rápido (sem overhead de subir um container Docker por execução) e não exigiria Docker disponível no ambiente de CI/local. Descartada porque um mock não reproduz constraints de unicidade, cascade deletes, sequences nem a corrida de `WHERE version = ?` que a concorrência otimista depende — a suíte perderia justamente a categoria de bug que testes E2E deveriam capturar (regressões de migration e de comportamento do banco), ficando redundante com os testes unitários que já mockam essa camada.

### Banco compartilhado e persistente entre execuções (em vez de container efêmero)

Evitaria o custo de subir um Postgres a cada execução. Descartada porque testes que rodam contra um banco persistente acumulam estado entre execuções e entre desenvolvedores, exigindo disciplina de limpeza que um container efêmero (destruído ao final da suíte) torna desnecessária — o container garante isolamento por construção.

## Consequências

### Positivas

- **Detecta regressões reais de migration e de comportamento do banco** que um mock nunca capturaria (constraints, cascades, sequences, condições de corrida em updates).
- **Sem dependência de infraestrutura externa**: qualquer desenvolvedor ou pipeline de CI com Docker disponível roda a suíte completa sem provisionar um banco compartilhado.
- **Isolamento por padrão**: um container por execução elimina o problema de estado residual entre testes de diferentes desenvolvedores ou execuções.

### Negativas / Trade-offs

- **Suíte mais lenta**: subir um container PostgreSQL a cada execução E2E custa tempo de boot que um mock não teria — daí o timeout estendido de 10 minutos em `jest-e2e.json`.
- **Exige Docker disponível** em qualquer ambiente que rode a suíte E2E (CI e máquinas locais) — um ambiente sem Docker não consegue rodar esses testes.

### Riscos mitigados

- **Regressão de migration não detectada em testes unitários com mocks**: mitigada por rodar contra um schema real, migrado da mesma forma que produção.
- **Lost update não detectado em concorrência otimista**: mitigado por exercitar o `WHERE version = ?` real do Postgres, não uma simulação.

## Referências

- [`docs/testing.md`](../testing.md) — suítes cobertas, helpers compartilhados, configuração do Testcontainers.
- [ADR 0010 — Concorrência otimista via coluna `version`](0010-concorrencia-otimista-via-version.md)
- `test/jest-e2e.json`, `test/helpers/test-app.helper.ts`.
