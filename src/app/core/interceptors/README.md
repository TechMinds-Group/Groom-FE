# Http Interceptors (`src/app/core/interceptors`)

**Objetivo**
Manipular intrinsecamente parâmetros, cabeçalhos ou dados injetados dentro de requisições enviadas e respostas HTTP recebidas globalmente no ciclo de vida da API.

**O que DEVE entrar aqui:**
- Funções baseadas em `HttpInterceptorFn`.
- Injeções implícitas de `Authorization: Bearer Token` em requisições de saída.
- Catch global de exceções, interceptando falhas (500, 403, 401) e acionando fallbacks de maneira reativa, padronizada e global.
