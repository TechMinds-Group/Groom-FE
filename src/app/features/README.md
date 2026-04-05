# Features (`src/app/features`)

**Objetivo**
Conter as páginas reais da aplicação e suas respectivas lógicas de negócio. Cada "feature" (contexto) atua como um bloco isolado e independente do restante do sistema.

**O que DEVE entrar aqui:**

- Pastas divididas por contextos do sistema (exemplos: `auth`, `dashboard`, `users`).
- Dentro de cada uma dessas pastas isoladas, a estrutura deve conter:
  - `pages/`: Arquivos de rotas (`.routes.ts`) e os componentes "Smart" que agrupam o visual de uma tela completa.
  - `data-access/`: Lógicas de requisição à API e gerenciamento de estado atreladas exclusivamente a este contexto (ex: a arquitetura de "Garçom e Cozinheiro" lendo dados locais).
  - `ui/`: Componentes visuais (Dumb Components) criados para serem usados apenas aqui.

**O que NÃO deve entrar aqui:**

- Componentes, pipes ou filtros de caráter genérico.
  - _Exemplo_: Se um `botao-azul` vai ser útil no Login e também no Dashboard, ele não pertence a nenhuma _Feature_, ele deve ir para o `shared/ui`.
- Serviços de gerenciamento global ou autenticação principal (estes pertencem a `core/services`).
