# CLAUDE.md — OpenBox-Crawler (OBC)

Complementa o `CLAUDE.md` global (`C:\Github\CLAUDE.md`). Em caso de conflito, este arquivo prevalece.

## Projeto

Agregador de anúncios **open box**. Uma extensão do Chrome captura o HTML das páginas das lojas no navegador do usuário, a API extrai os produtos e o front permite filtrar e acompanhar preços.

- Jira: projeto **OBC** em https://se77ings.atlassian.net (decisões de arquitetura na OBC-1)
- Projeto de portfólio: histórico de commits limpo e código legível importam tanto quanto funcionar
- Repositório público: https://github.com/Se77ings/OpenBox-Crawler (licença MIT). Nunca commitar segredos, `.env` ou dados capturados.

## Fluxo no Jira

1. Ao começar uma tarefa: mover o card para **Em Andamento**
2. Durante o trabalho: registrar no card decisões que mudem o planejado
3. Ao terminar (critérios de aceite atendidos e push feito): comentar o resumo do que foi entregue e mover para **Concluído**

## Commits

- Formato: `tipo(OBC-n): descrição em português`. O escopo é a chave da issue do Jira.
  - Ex.: `feat(OBC-3): adiciona value object Money`
- Commits sem issue (raros) usam um escopo de módulo: `chore(deps): ...`
- Granularidade conforme o CLAUDE.md global: um commit por unidade de trabalho com sentido próprio. Normalmente uma tarefa do Jira vira um commit, ou poucos se tiver etapas bem distintas.
- Corpo do commit em tópicos, explicando o que entrou e o **porquê** das decisões não óbvias
- **Nunca** adicionar `Co-Authored-By` ou qualquer atribuição a IA
- Antes de commitar: `pnpm check` precisa passar

## Arquitetura

```
src/domain        entidades, value objects, views e interfaces. NÃO importa nada.
src/application   orquestra domain e infra: serviços de aplicação, Request/Response (Zod), DI.
                  Importa só domain. Não tem telas nem HTTP.
src/infra         Drizzle/SQLite, repositories, queries, extratores (cheerio). Importa só domain.
apps/api          Fastify + composition root. Importa todas as camadas.
apps/web          React (OBC-12)
apps/extension    extensão do Chrome com WXT (OBC-8)
```

- As camadas funcionam como **Class Libraries**: o código fica direto na raiz da camada (sem `src/` interno), não há `index.ts` e elas nunca são compiladas sozinhas (sem `dist/`). O `tsc` só verifica tipos.
- Só os apps geram build. A api é empacotada pelo `tsup` num único arquivo com as camadas dentro.
- Cada arquivo é importado pelo caminho, como um namespace: `import { Website } from '@obc/domain/websites/Website'`.
- Dentro da camada, imports relativos sem extensão: `import { Money } from '../shared/Money'`.
- **Domain** organizado por agregado: `websites/`, `crawlRuns/`, `products/`, mais `shared/` e `extraction/`.
- **Infra** organizada por tipo: `mappings/` (tabelas do Drizzle), `migrations/` (geradas pelo `pnpm --filter @obc/infra db:generate`), `repositories/`, `queries/`, `database/` (conexão e Unit of Work) e `shared/`.
- Escritas sempre pelo **Unit of Work**: os repositórios acumulam as alterações e o `commit()` grava tudo numa única transação. Uma unidade por operação (`IUnitOfWorkFactory.create()`).
- As fronteiras são verificadas pelo `eslint-plugin-boundaries` e pelas dependências de cada `package.json`. Não contorne com imports relativos entre camadas.
- `domain` e `application` não têm `@types/node`: nada de APIs do Node nessas camadas.
- Valores monetários sempre em **centavos (inteiro)**. Nunca `number` com casas decimais, `REAL` ou `decimal`.

## Convenção de nomes

- **Um tipo principal por arquivo, e o nome do arquivo é o nome do que ele exporta** (como no C#). Tipos auxiliares que só existem para aquele tipo (ex.: `WebsiteProps`) ficam no mesmo arquivo.
- **PascalCase** para classes, interfaces e tipos; **camelCase** para funções soltas e pastas.

| O que é                 | Padrão              | Exemplo                                                     |
| ----------------------- | ------------------- | ----------------------------------------------------------- |
| Entidade                | `Nome`              | `Website.ts`, `CrawlRun.ts`                                 |
| Value object            | `Nome`              | `Money.ts`, `WebsiteUrl.ts`                                 |
| Interface               | prefixo `I`         | `IWebsiteRepository.ts`, `IProductExtractor.ts`             |
| Repositório             | sufixo `Repository` | `IWebsiteRepository` (domain) → `WebsiteRepository` (infra) |
| Consultas               | sufixo `Queries`    | `IProductQueries` → `ProductQueries`                        |
| Retorno de consulta     | sufixo `View`       | `ProductListItemView.ts`                                    |
| Entrada da API          | sufixo `Request`    | `RegisterWebsiteRequest.ts`                                 |
| Saída da API            | sufixo `Response`   | `WebsiteResponse.ts`                                        |
| Serviço da application  | sufixo `Service`    | `WebsiteService.ts`                                         |
| União de valores (enum) | `Nome`              | `ProductCondition.ts`, `CrawlRunStatus.ts`                  |
| Função solta            | camelCase           | `comparePrice.ts`                                           |
| Pasta                   | camelCase           | `crawlRuns/`, `extraction/`                                 |
| Teste                   | arquivo + `.test`   | `Money.test.ts`, ao lado do arquivo testado                 |

- Códigos de `DomainError` são textos estáveis no formato `agregado.motivo` (ex.: `crawl-run.invalid-transition`).

## Regras para a coleta (não negociáveis)

- Nada de crawler no servidor: toda captura passa pela extensão, numa aba visível e iniciada pelo usuário.
- Sem User-Agent falso, sem plugins "stealth", sem resolver captcha/desafio do Cloudflare automaticamente.
- Paginação pela navegação do próprio site (clique ou rolagem), nunca montando URLs com `?`.
- Intervalo de 3 a 8 s entre páginas e limite de páginas por busca.

## Comandos

| Comando          | O que faz                                           |
| ---------------- | --------------------------------------------------- |
| `pnpm install`   | Instala dependências e liga os pacotes do workspace |
| `pnpm dev`       | Sobe a API em modo watch                            |
| `pnpm build`     | Gera o build dos apps (a api via `tsup`)            |
| `pnpm test`      | Testes (Vitest)                                     |
| `pnpm lint`      | ESLint, incluindo as fronteiras entre camadas       |
| `pnpm format`    | Prettier                                            |
| `pnpm check`     | typecheck + lint + format:check + test              |
| `pnpm typecheck` | `tsc --noEmit` em cada pacote                       |

## Ferramentas

- Node 24, pnpm 10, TypeScript 6.0 (fixado: o `typescript-eslint` ainda não suporta o TS 7)
