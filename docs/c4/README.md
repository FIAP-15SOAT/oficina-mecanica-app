# Modelo C4 — Sistema da Oficina Mecânica

Diagramas C4 (https://c4model.com) descrevendo a arquitetura do sistema, em português.

## Estrutura

- `*.puml` — fonte de cada diagrama (PlantUML + [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML)).
- `images/` — PNGs gerados a partir dos `.puml`.
- `lib/C4-PlantUML/` — biblioteca C4-PlantUML vendorizada, para renderização reprodutível offline.

## Convenções seguidas em todos os diagramas

- Nome do sistema em foco é sempre **"Sistema da Oficina Mecânica"**, idêntico em todos os níveis (Context, Container, Componente) — é o mesmo sistema, só muda o zoom.
- Todo elemento declara o tipo explicitamente (`[Pessoa]`, `[Sistema de Software]`, `[Container: tecnologia]`, `[Componente: tecnologia]`), via `SHOW_ELEMENT_TYPE()`, conforme exigido pela documentação oficial do C4 e pelo material da aula (Aula 2 - Documentação de Arquitetura com o Modelo C4).
- Cantos arredondados (`-DROUNDED_STYLE=1`), igual ao estilo oficial do C4 model/Structurizr.
- Pessoas usam a silhueta oficial (círculo + corpo, via `SHOW_PERSON_OUTLINE()`), conforme os exemplos de `c4model.com/diagrams/system-context` e `.../container`.
- No diagrama de Componente, cada componente leva o ícone UML clássico (dois retângulos), igual à legenda de `c4model.com/diagrams/component`. Como a forma nativa `component` do PlantUML não herda o estilo de cor do C4-PlantUML, foi necessário um bloco `skinparam component {...}` manual replicando as cores padrão (`#85BBF0`/`#78A8D8`) para manter a mesma paleta.

## Diagramas

1. **Contexto do Sistema** (`c4-system-context.puml`) — nível 1: o mais macro de todos, pensado para stakeholders não técnicos. Mostra apenas pessoas (Administrador, Mecânico, Atendente, Cliente da Oficina) e o Servidor SMTP como sistema externo — o PostgreSQL não aparece neste nível por ser detalhe interno. As caixas de pessoa descrevem quem elas são (não o que fazem); a ação fica no rótulo da seta. Nenhuma seta menciona protocolo/tecnologia (HTTP, JWT, SQL etc.) — isso é detalhe de nível mais baixo. Nomes sem sufixo técnico: "Sistema da Oficina Mecânica" (não "...API") e "Servidor SMTP" (não "MailHog", que é só a implementação de dev usada no nível de Container).
2. **Container** (`c4-container.puml`) — nível 2: dentro da fronteira do Sistema da Oficina Mecânica há dois containers, a **API REST** (NestJS/Node.js/TypeScript) e o **Banco de Dados** (PostgreSQL, auto-hospedado no mesmo cluster/infra do time). Aqui sim aparecem tecnologia e protocolo nas setas, como recomendado para este nível. O servidor SMTP/MailHog permanece como sistema externo (aqui já com o nome técnico). Confirmado por análise de código/infra que não há workers, filas ou cache separados; o Job de migração do Kubernetes reutiliza a mesma imagem da API e não é modelado como container à parte.
3. **Componente** (`c4-component.puml`) — nível 3: zoom dentro do container **API REST**, mostrando os 9 módulos de negócio (Auth, Usuários, Clientes, Veículos, Serviços, Peças/Insumos, Ordens de Serviço, Orçamentos, Estoque) e 2 componentes transversais (Guards/Segurança, Repositories/Prisma), com as dependências reais entre módulos levantadas no código (ex.: Ordens de Serviço ↔ Orçamentos, Orçamentos → Estoque/SMTP). Inclui também o **Cliente da Oficina** como pessoa externa conectada diretamente ao componente Orçamentos (fluxo de aprovação por link, sem login) — é a única pessoa que interage com um componente específico em vez de passar só pela API como um todo. As setas entre componentes do mesmo container não levam rótulo de tecnologia (só "Uses" implícito na ação) — tecnologia só aparece quando a seta cruza para um container/sistema externo (Banco de Dados, Servidor SMTP), seguindo o exemplo oficial (Figura 3 do material da aula). A dependência de quase todos os módulos em relação a Guards/Segurança e Repositories está descrita no texto de cada um desses dois componentes, não desenhada como setas — evita ~18 setas repetidas que poluiriam o diagrama sem agregar informação nova.

**Diagrama de Código (nível 4) não será feito** — é opcional no C4 model, mais adequado para geração automática a partir do código do que para desenho manual, e não agrega valor sobre o que o diagrama de Componente já mostra. **System Landscape também fica fora**, pois só faz sentido quando há múltiplos sistemas de software para mapear, e este projeto documenta um único sistema.

Não há diagrama de Deployment (Kubernetes/Terraform) ainda — em aberto, ver conversa para decidir se será feito.

## Como regenerar as imagens

Requer Docker. A partir de `docs/c4/`:

```bash
docker run --rm -v "$(pwd)":/data plantuml/plantuml -tpng -DRELATIVE_INCLUDE=1 -DROUNDED_STYLE=1 -o images c4-system-context.puml
docker run --rm -v "$(pwd)":/data plantuml/plantuml -tpng -DRELATIVE_INCLUDE=1 -DROUNDED_STYLE=1 -o images c4-container.puml
docker run --rm -v "$(pwd)":/data plantuml/plantuml -tpng -DRELATIVE_INCLUDE=1 -DROUNDED_STYLE=1 -o images c4-component.puml
```

- `-DRELATIVE_INCLUDE=1` é necessária para que os `!include` internos da própria biblioteca C4-PlantUML (ex.: `C4_Container.puml` incluindo `C4_Context.puml`) usem os arquivos vendorizados em `lib/` em vez de buscar no GitHub — sem ela, a renderização ainda funciona (se houver rede), mas deixa de ser 100% offline.
- `-DROUNDED_STYLE=1` usa caixas com cantos arredondados, igual ao estilo oficial do C4 model/Structurizr (em vez do retângulo de canto reto que é o padrão do C4-PlantUML).
