# Core Module (`src/app/core`)

**Objetivo**
Centralizar a infraestrutura corporativa e os serviços vitais da aplicação que precisam ser instanciados apenas uma vez (Singletons) e disponibilizados globalmente em toda a árvore de execução.

**O que DEVE entrar aqui:**
- Serviços de infraestrutura ou estado global (ex: `AuthService`, `ThemeService`).
- Configurações essenciais de funcionamento contínuo, como Interceptors HTTP e Route Guards.

**O que NÃO deve entrar aqui:**
- Reuso de UI (Componentes, HTML, CSS).
- Pipes e diretivas globais.
- Lógicas e requisitos de negócio restritos a páginas específicas do projeto.
