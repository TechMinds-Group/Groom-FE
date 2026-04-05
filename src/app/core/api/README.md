# API Layer (`src/app/core/api`)

**Objetivo**
Abstrair, centralizar e padronizar o canal direto de comunicação do Frontend com a API consumida externamente ou banco de dados.

**O que DEVE entrar aqui:**
- Classes abstratas de infraestrutura (ex: `base.service.ts`).
- Utilitários REST ou adapters robustos que encapsulam o `HttpClient` e injetam padronizações técnicas (reaproveitamento de retries genéricas ou mappings).

**O que NÃO deve entrar aqui:**
- Injeções de regras de UI baseadas nos retornos da API (isso ocorre na camada de UI via consumo dos serviços e interceptors).
