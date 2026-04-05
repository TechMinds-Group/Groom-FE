# Shared Models (`src/app/shared/models`)

**Objetivo**
Armazenar contratos estáveis, promovendo a tipagem estrita via TypeScript garantindo que transações sigam as normativas definidas no back-end.

**O que DEVE entrar aqui:**
- Interfaces cross-feature, DTOs utilitários aplicáveis globalmente ou layouts envelopados de API Response, simplificando as estruturas de `HttpClient` e paginação.
- Enumerações genéricas (Enums).

**O que NÃO deve entrar aqui:**
- Classes com construtores que gerenciam estado (Services/Classes operacionais ativas).
