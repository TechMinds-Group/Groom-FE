# Global Services (`src/app/core/services`)

**Objetivo**
Fornecer serviços com escopo Application-Level injetados nativamente na raiz do projeto (`providedIn: 'root'`) que expõem processamentos globais paralelos aos dados.

**O que DEVE entrar aqui:**
- Provedores e gerenciadores estáveis (Session, Layout Preference, Web Storage Global API).
- Gestão de Notificadores base da infraestrutura ou eventos em cadeia cross-feature (Global Bus).

**O que NÃO deve entrar aqui:**
- Serviços HTTP diretamente atrelados a tabelas da API ou regras puras de uma tela física apenas (exemplo, chamadas REST isoladas ligadas apenas a usuários ou equipamentos). Estes vão para as `features`.
