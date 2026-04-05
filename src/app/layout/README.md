# Layout (`src/app/layout`)

**Objetivo**
Conter os componentes estruturais que formam o layout base do projeto. São os componentes que permanecem fixos na tela enquanto o usuário navega pelas páginas.

**O que DEVE entrar aqui:**
- Cabeçalho superior (Header / Navbar).
- Menus de navegação (Sidebar).
- Rodapé (Footer).
- O componente mestre de layout (exemplo: `MainLayoutComponent`), cujo template agrupa os itens acima e disponibiliza o `<router-outlet>` para exibir o conteúdo das rotas.

**O que NÃO deve entrar aqui:**
- Componentes reutilizáveis isolados, como botões ou modais genéricos (estes vão para `shared/ui`).
- Telas, formulários ou fluxos de negócio específicos (estes vão para `features`).
