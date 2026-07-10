# 🔒 Segurança

Mitigações aplicadas no código e índice de relatórios de segurança.

## Índice

- [Relatórios](#relatórios)
- [Mitigações aplicadas no código](#mitigações-aplicadas-no-código)

## Relatórios

Relatórios de segurança da aplicação ficam versionados em [`reports/`](../reports). Na raiz de cada ferramenta fica o relatório mais recente, enquanto o histórico é organizado por data no formato `YYYY-MM-DD`.

- **DAST (OWASP ZAP)** — relatórios em [`reports/zap/`](../reports/zap) (HTML e PDF).
- **Qualidade e cobertura (SonarQube)** — relatórios em [`reports/sonarqube/`](../reports/sonarqube) (PDF).
- **Resumo executivo consolidado** — histórico em [`reports/others/`](../reports/others).

## Mitigações aplicadas no código

- Helmet (cabeçalhos de segurança HTTP)
- CORS com lista branca via `ALLOWED_ORIGINS`
- `SanitizeStringsPipe` global (sanitização de inputs em DTOs antes do `ValidationPipe`)
- `ValidationPipe` global com `whitelist: true`, `forbidNonWhitelisted: true` e `transform: true`
- Senhas com bcrypt (`BCRYPT_SALT_ROUNDS`) e regra de força aplicada tanto no DTO quanto no domínio (`User.validatePasswordStrength`)
- JWT com access + refresh token e segredos separados (`JWT_SECRET` / `JWT_REFRESH_SECRET`)
- Token assinado dedicado para o link público de decisão de orçamento (`QUOTE_DECISION_TOKEN_SECRET`), com validação de `quoteId`, `action` e `type`
- Concorrência otimista em agregados sensíveis (`WorkOrder`, `Quote`, `PartSupply`) para evitar lost updates
- Filtros de exceção que nunca expõem stack traces ou detalhes do banco para o cliente
