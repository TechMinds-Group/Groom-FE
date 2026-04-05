# Shared Directives (`src/app/shared/directives`)

**Objetivo**
Armazenar diretivas customizadas puras focadas exclusivamente em manipular comportamentos, eventos e formatações intrínsecas a elementos primitivos do DOM de maneira não obtrusiva.

**O que DEVE entrar aqui:**
- Modificadores reusáveis de input tag (ex: implementações visuais baseadas em máscaras complexas para CPF, moeda, telefone).
- Controladores dinâmicos de renderização física (`@Directive` agindo sobre ViewContainerRef), evitando duplicações lógicas em múltiplos métodos.
