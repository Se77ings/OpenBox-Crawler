# OpenBox-Crawler

Agregador de anúncios **open box** de lojas de informática. Reúne as ofertas de vários sites num só lugar, com filtros por produto, preço e desconto, além de histórico de preços para identificar quedas.

> 🚧 Em desenvolvimento. O planejamento está dividido em tarefas no Jira (projeto OBC).

## Como funciona

As lojas monitoradas protegem suas páginas contra acesso automatizado. Por isso o OBC **não tem um crawler no servidor**: a coleta acontece no navegador do usuário, por meio de uma extensão do Chrome, sempre a partir de um clique.

```
OBC Web ──"Buscar"──▶ Extensão do Chrome ──abre a página da loja (aba visível)
                             │
                             └──HTML capturado──▶ OBC API ──extrai produtos──▶ SQLite
                                                     │
OBC Web ◀──────────── progresso e resultado ─────────┘
```

- **Cadastro em duas etapas:** o usuário informa a URL da página de open box, a API identifica o site (nome, logo, extrator) e o usuário confirma.
- **Extratores por site:** uma interface comum com uma implementação por loja, escolhida no cadastro.
- **Dois bancos:** um consistente (sites, rodadas, histórico de preços) e um volátil (ofertas da última busca), trocados de forma atômica a cada busca.
- **Boa convivência com os sites:** uma busca por vez, intervalo entre páginas, limite de páginas e nenhuma tentativa de burlar proteções.

## Arquitetura

Monorepo com back-end em três camadas. As camadas funcionam como bibliotecas (Class Libraries): não são executadas nem compiladas sozinhas, e a API é empacotada com elas dentro.

```
src/
  domain/        Entidades, value objects e contratos. Não depende de nada.
  application/   Orquestra domain e infra (serviços, Request/Response). Depende apenas de domain.
  infra/         Persistência e extratores de HTML. Depende apenas de domain.
apps/
  api/           API HTTP e composition root (injeção de dependências).
  web/           Front-end React.
  extension/     Extensão do Chrome.
```

Cada arquivo é importado pelo caminho, como um namespace:

```ts
import { Website } from '@obc/domain/websites/Website';
```

A direção das dependências é verificada automaticamente:

- **na verificação de tipos**, pelas dependências declaradas em cada pacote (uma camada não enxerga o que não declarou);
- **no lint**, pelo [`eslint-plugin-boundaries`](https://www.jsboundaries.dev/), que bloqueia imports relativos entre camadas.

## Stack

| Área      | Tecnologias                                               |
| --------- | --------------------------------------------------------- |
| Linguagem | TypeScript (strict)                                       |
| Back-end  | Node.js 24, Fastify, Drizzle ORM, SQLite, cheerio, Zod    |
| Front-end | React, Vite, TanStack Query, shadcn/ui                    |
| Extensão  | Chrome Manifest V3, WXT                                   |
| Qualidade | Vitest, ESLint (typescript-eslint + boundaries), Prettier |
| Monorepo  | pnpm workspaces                                           |

## Rodando localmente

Pré-requisitos: Node.js 24 e pnpm 10.

```bash
pnpm install
pnpm dev        # sobe a API em modo watch
pnpm check      # typecheck, lint, formatação e testes
```

| Script        | Descrição                                |
| ------------- | ---------------------------------------- |
| `pnpm build`  | Gera o build dos apps                    |
| `pnpm test`   | Executa os testes                        |
| `pnpm lint`   | Lint, incluindo as regras de arquitetura |
| `pnpm format` | Formata o código                         |

## Convenções

Commits seguem o [Conventional Commits](https://www.conventionalcommits.org/pt-br/), com a chave da tarefa do Jira como escopo:

```
feat(OBC-3): adiciona value object Money
```

## Licença

[MIT](LICENSE) © Gabriel Fernandes
