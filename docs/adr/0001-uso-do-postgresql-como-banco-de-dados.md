# ADR 0001: Uso do PostgreSQL como Banco de Dados Relacional

## Status

Aceito — 2026-04-07

## Contexto

O sistema de gestão da oficina mecânica precisa persistir dados de domínios fortemente relacionados entre si: clientes (PF/PJ), veículos, ordens de serviço, serviços executados, peças/insumos, orçamentos e movimentações de estoque. Esses dados possuem características que orientam a escolha do mecanismo de persistência:

- **Forte integridade referencial**: uma ordem de serviço referencia cliente, veículo, serviços e peças; uma movimentação de estoque referencia uma peça e, opcionalmente, uma OS. A consistência dessas relações é crítica para o negócio.
- **Transações multi-tabela**: aprovar um orçamento, baixar peças do estoque, atualizar o status da OS e registrar a movimentação são operações que precisam ocorrer atomicamente.
- **Modelo de dados estável e bem definido**: as entidades do domínio são conhecidas a priori e mudam de forma controlada via migrações, não há necessidade de armazenamento schemaless.
- **Consultas analíticas e relatórios**: agregações por status, período, cliente, mecânico, peça, etc. exigem joins eficientes e suporte robusto a SQL.
- **Requisitos de validação de negócio**: regras como CPF/CNPJ únicos, placa única por veículo e transições válidas de status de serviço precisam ser apoiadas por restrições no banco (UNIQUE, FOREIGN KEY, CHECK).
- **Equipe e ecossistema**: o time tem familiaridade com SQL; o ORM adotado (Prisma) tem suporte de primeira classe a PostgreSQL; o pipeline de CI e o `docker-compose.yml` local já contemplam Postgres.

## Decisão

Adotar o **PostgreSQL** como o sistema de gerenciamento de banco de dados (SGBD) oficial do projeto, acessado via **Prisma ORM**.

A configuração é feita pela variável de ambiente `DATABASE_URL`, e o provider `postgresql` é declarado no `prisma/schema.prisma`. A infraestrutura local é provida pelo `docker-compose.yml`, e o deploy de migrações é feito pelo comando `prisma migrate deploy` (encapsulado no script `npm run db:setup`).

## Alternativas consideradas

### MySQL / MariaDB
SGBDs relacionais maduros e amplamente adotados. Foram descartados porque:
- Suporte a tipos avançados (JSONB, arrays, tipos enumerados nativos, intervalos) é mais limitado que o do Postgres.
- Recursos de consultas (CTEs recursivas, window functions, full-text search nativo) são historicamente menos completos.
- A integração do Prisma com Postgres oferece recursos exclusivos (ex.: `citext`, índices parciais, melhor suporte a `enum`).

### SQLite
Adequado a aplicações embarcadas ou ambientes locais simples. Descartado porque:
- Não atende ao cenário de múltiplos clientes concorrentes em produção (atendentes, mecânicos e gestores acessando simultaneamente).
- Não há controle granular de papéis e conexões remotas.
- Restrições de escrita concorrente são incompatíveis com o volume esperado.

### MongoDB ou outro NoSQL documental
Descartado porque:
- O domínio é essencialmente relacional; modelar OS, peças e movimentações de estoque como documentos exigiria duplicação de dados ou referências manuais sem garantias de integridade.
- Transações multi-documento em NoSQL têm custo e limitações que não compensam neste cenário.
- Relatórios e agregações complexas são naturais em SQL e exigiriam ferramental adicional em NoSQL.

### SQL Server / Oracle
Descartados por custo de licenciamento e por não trazerem benefícios técnicos relevantes ao caso de uso quando comparados ao PostgreSQL, que é open source.

## Consequências

### Positivas
- **Integridade garantida pelo banco**: chaves estrangeiras, restrições UNIQUE e CHECK reforçam invariantes do domínio na camada de persistência, complementando as validações das entidades.
- **Transações ACID** naturais para operações multi-tabela (aprovação de orçamento, baixa de estoque, mudança de status de OS).
- **Tipagem rica**: `enum` nativos espelham os enums do domínio (`WorkOrderStatus`, `StockMovementType`, etc.), e tipos como `numeric` preservam precisão monetária.
- **Performance e escalabilidade verticais bem documentadas**, com suporte a índices parciais, expression indexes e particionamento se necessário no futuro.
- **Ecossistema maduro**: Prisma, ferramentas de observabilidade, drivers e provedores gerenciados (RDS, Cloud SQL, Supabase, Neon) são todos opções de produção.
- **Custo zero de licenciamento** (open source, BSD-like).

### Negativas / Trade-offs
- O time precisa manter migrações Prisma versionadas e revisadas — qualquer alteração de schema exige `prisma migrate` e regeneração do client.
- Em produção, requer infraestrutura adicional (instância gerenciada ou container com volume persistente, backups, monitoração).
- A escolha de um SGBD relacional impõe modelagem prévia: mudanças disruptivas no schema têm custo maior que em soluções schemaless.

### Riscos mitigados
- **Bloqueio em produção por mudança de schema**: mitigado pelo uso de migrações incrementais e pelo workflow de PRs com CI executando os testes contra o schema atual.
- **Acoplamento ao SGBD**: mitigado pela Clean Architecture — repositórios são abstrações de domínio (`domain/interfaces/`) e o Prisma vive isolado em `infrastructure/repositories/`. Caso seja necessário trocar o SGBD no futuro, o impacto fica restrito à camada de infraestrutura.

## Referências

- Documentação do PostgreSQL: https://www.postgresql.org/docs/
- Documentação do Prisma: https://www.prisma.io/docs/
