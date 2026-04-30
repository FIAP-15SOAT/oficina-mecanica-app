# Relatório de Segurança — Oficina Mecânica API

**Data:** 2026-04-27 01:30  
**Branch:** `feature/owasp-zap-security-scan`  
**Versão da API:** 1.0.0  
**Ambiente:** Local (Docker Compose)  

---

## Resumo Executivo

| Item | Resultado |
|------|-----------|
| Scan DAST (OWASP ZAP autenticado) | 0 vulnerabilidades reais — 1 falso positivo confirmado |
| Scan SAST (Semgrep) | 0 findings |
| Endpoints testados | 87 URLs |
| Verificações executadas | 118 |
| SQL Injection (time-based) | PASS |
| XSS (Reflected, Stored, DOM) | PASS |
| RCE / Command Injection | PASS |
| Path Traversal | PASS |
| XXE / SSRF | PASS |

**Conclusão:** A API não apresenta vulnerabilidades reais. As 4 vulnerabilidades identificadas no scan inicial foram todas corrigidas. O único aviso remanescente é um falso positivo confirmado do ZAP (detalhado abaixo).

---

## Ferramentas Utilizadas

| Ferramenta | Tipo | Versão | Finalidade |
|------------|------|--------|------------|
| OWASP ZAP (`zap-api-scan.py`) | DAST | stable (Java 17.0.18) | Scan dinâmico com autenticação JWT |
| Semgrep | SAST | latest | Análise estática do código-fonte |

---

## Metodologia

### DAST — OWASP ZAP (Scan Autenticado)
- Importação automática do schema OpenAPI via `/api/docs-json`
- Autenticação com token JWT de usuário ADMIN via header `Authorization: Bearer <token>`
- 87 URLs mapeadas, cobrindo todos os módulos: Auth, Users, Customers, Vehicles, Services, Parts & Supplies, Work Orders, Quotes
- Execução do `zap-api-scan.py` com regras ativas e passivas

### SAST — Semgrep
- Análise do diretório `/src` com os rulesets:
  - `p/nodejs` — vulnerabilidades comuns em Node.js
  - `p/jwt` — uso inseguro de JSON Web Tokens
  - `p/owasp-top-ten` — OWASP Top 10
  - `p/secrets` — segredos hardcoded

---

## Resultados SAST — Semgrep

**Nenhum finding encontrado.**

O código-fonte passou em todas as verificações dos rulesets aplicados. Não foram encontrados segredos hardcoded, uso inseguro de JWT, injeções ou vulnerabilidades do OWASP Top 10 no código-fonte.

---

## Falso Positivo Remanescente

### SQL Injection [40018] — `POST /api/services` → 409 Conflict

**Classificação:** Falso positivo confirmado

O ZAP injeta strings com caracteres SQL (ex: `' OR 1=1 --`) no campo `name` do corpo da requisição. Como o campo aceita qualquer string válida, o dado é armazenado normalmente pelo Prisma via prepared statements. Na segunda requisição com o mesmo nome, a API retorna **409 Conflict** (serviço já cadastrado). O ZAP interpreta o 409 como evidência de erro de SQL injection, o que é incorreto.

**Por que não é uma vulnerabilidade real:**
- Todos os testes de SQL injection time-based passaram: PostgreSQL, MySQL, Oracle, MsSQL, Hypersonic (regras 40019–40022, 40027)
- O Prisma ORM usa prepared statements em todas as queries, não há interpolação direta de string
- O 409 é o comportamento correto da aplicação, não um erro de banco de dados

---

## Vulnerabilidades Identificadas e Corrigidas

### 1. Header `X-Content-Type-Options` ausente

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Baixa |
| **ID ZAP** | 10021 |
| **Status** | Corrigido |

**Descrição:** O header `X-Content-Type-Options: nosniff` não estava presente nas respostas.

**Correção:** Instalado o pacote `helmet` e configurado em `src/main.ts` via `app.use(helmet())`. O Helmet adiciona automaticamente `X-Content-Type-Options: nosniff` e outros headers de segurança em todas as respostas.

---

### 2. Header `X-Powered-By` expondo stack tecnológica

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Baixa |
| **ID ZAP** | 10037 |
| **Status** | Corrigido |

**Descrição:** O header `X-Powered-By: Express` estava presente em todas as respostas, revelando a stack da aplicação.

**Correção:** Removido automaticamente pela configuração do `helmet()` em `src/main.ts`.

---

### 3. CORS sem restrição de origem

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Média |
| **ID ZAP** | 10098 |
| **Status** | Corrigido |

**Descrição:** A API estava configurada com `app.enableCors()` sem restrição de origens, retornando `Access-Control-Allow-Origin: *` em todas as respostas.

**Correção:** Substituído `app.enableCors()` por configuração restritiva em `src/main.ts`. As origens permitidas são lidas da variável de ambiente `ALLOWED_ORIGINS` (separadas por vírgula), com fallback para `http://localhost:3000` em desenvolvimento. Variável documentada no `.env.example`.

```typescript
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'];
app.enableCors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true,
});
```

---

### 4. Erro 500 em parâmetros com null byte

| Campo | Detalhe |
|-------|---------|
| **Severidade** | Média |
| **ID ZAP** | 100000 |
| **Status** | Corrigido |

**Descrição:** O ZAP injetou o caractere nulo (`%00`) nos parâmetros de query string e a API retornou HTTP 500, expondo erros internos ao cliente.

**Correção (parte 1 — sanitização de entrada):** Criado o `SanitizeStringsPipe` em `src/infrastructure/pipes/sanitize-strings.pipe.ts`. O pipe remove caracteres nulos (`\0`) de todas as strings recursivamente antes da validação. Registrado em `src/main.ts` como o primeiro pipe global, antes do `ValidationPipe`.

**Correção (parte 2 — tratamento de erros):** Criado o `AllExceptionsFilter` em `src/infrastructure/filters/all-exceptions.filter.ts`. Atua como fallback global, interceptando exceções não tratadas pelos filtros específicos. Erros 500 retornam apenas `"An unexpected error occurred"`, sem expor stack trace ou detalhes internos. JSON malformado no corpo da requisição é detectado e retorna 400. Registrado em `src/app.module.ts` como o primeiro `APP_FILTER`.

**Correção (parte 3 — race condition no repositório):** O `PrismaClientKnownRequestError` com código P2002 (unique constraint) não estava sendo tratado nos repositórios `PrismaServiceRepository` e `PrismaPartSupplyRepository`. Em condições de concorrência, o Prisma lançava o erro diretamente como 500. Adicionado tratamento explícito de P2002 nos métodos `create()` de ambos os repositórios, convertendo para `ResourceConflictException` (409).

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/main.ts` | Adicionado `helmet()`, `SanitizeStringsPipe` global, CORS restritivo com `ALLOWED_ORIGINS` |
| `src/app.module.ts` | Registrado `AllExceptionsFilter` como `APP_FILTER` |
| `src/infrastructure/filters/all-exceptions.filter.ts` | Criado — filtro global de exceções não tratadas, com suporte a SyntaxError de JSON malformado |
| `src/infrastructure/pipes/sanitize-strings.pipe.ts` | Criado — pipe que remove null bytes de todas as strings recursivamente |
| `src/infrastructure/repositories/prisma-service.repository.ts` | Tratamento de P2002 no `create()` → `ResourceConflictException` |
| `src/infrastructure/repositories/prisma-part-supply.repository.ts` | Tratamento de P2002 no `create()` → `ResourceConflictException` |
| `.env.example` | Adicionada variável `ALLOWED_ORIGINS` |
| `package.json` / `package-lock.json` | Adicionada dependência `helmet` |

---

## Verificações que Passaram (destaque)

| Verificação | Resultado |
|-------------|-----------|
| SQL Injection time-based (PostgreSQL, MySQL, Oracle, MsSQL, Hypersonic) | PASS |
| Cross Site Scripting (Reflected, Stored, DOM Based) | PASS |
| Remote Code Execution (Shell Shock, CVE-2012-1823, React2Shell) | PASS |
| Path Traversal | PASS |
| Remote File Inclusion | PASS |
| XML External Entity Attack | PASS |
| Server Side Template Injection | PASS |
| CRLF Injection | PASS |
| Command Injection (Remote OS, Time Based) | PASS |
| Log4Shell / Spring4Shell | PASS |
| Buffer Overflow / Format String Error | PASS |
| JWT secrets hardcoded (Semgrep) | PASS |
| OWASP Top 10 no código-fonte (Semgrep) | PASS |
| Segredos hardcoded (Semgrep) | PASS |

---

## Próximos Passos

- Rodar novo scan OWASP ZAP após a conclusão do módulo de Ordens de Serviço (OS) pelo restante da equipe
- Adicionar `ALLOWED_ORIGINS` no ambiente de produção/staging antes do deploy
- Considerar integrar o scan ZAP no pipeline CI/CD para execução automática em PRs

---

## Artefatos Gerados

| Arquivo | Descrição |
|---------|-----------|
| `zap-reports/zap-report.html` | Relatório ZAP scan sem autenticação (scan inicial) |
| `zap-reports/zap-report-authenticated.html` | Relatório ZAP scan autenticado — pré-correções |
| `zap-reports/zap-report-final.html` | Relatório ZAP scan autenticado — pós-correções |
| `zap-reports/semgrep-report.json` | Relatório Semgrep em JSON |
| `zap-reports/SECURITY-REPORT_2026-04-27_01-30.md` | Este documento |
