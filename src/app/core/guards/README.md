# Route Guards (`src/app/core/guards`)

**Objetivo**
Proteger as rotas de navegação da aplicação, garantindo restrição, validação ou inicialização mandatória antes de um acesso em páginas que exigem métricas específicas.

**O que DEVE entrar aqui:**
- Funções guardiãs funcionais como `CanActivateFn`, `CanMatchFn` ou `CanDeactivateFn`.
- Casos de uso típicos: Restrição via verificação atômica de papéis (`role.guard.ts`) ou confirmação de transição em saídas de tela.

**O que NÃO deve entrar aqui:**
- Processamentos extensivos sem interface com o router global. Lógica pesada de autenticação primária deve estar no `AuthService` sendo apenas consumida e validada pelo Guard.
