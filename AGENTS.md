# Regras de Codificação e Desenvolvimento Frontend (Groom-FE)

> [!IMPORTANT]
> Estas regras devem ser seguidas rigorosamente em todos os arquivos de desenvolvimento frontend dentro deste repositório.

1. **Estilos Inline Proibidos**: É estritamente proibido o uso do atributo `style="..."` dentro de tags HTML. Toda estilização deve ser feita via classes ou arquivos de folha de estilo. Priorize o uso de CSS Variables globais definidas no `styles.scss` para cores e espaçamentos, garantindo que o app/lib seja tematizável.

2. **Prioridade de Frameworks UI**: A utilização de CSS customizado deve ser feita **somente e apenas** em casos onde seja tecnicamente impossível alcançar o resultado desejado utilizando as classes nativas do **Bootstrap** ou os componentes do **Angular Material**.

3. **Uso de Frameworks como Padrão**: O projeto deve utilizar majoritariamente **Bootstrap** e **Angular Material**, garantindo consistência visual e facilidade de manutenção em todo o ecossistema.

4. **Padronização de Ícones**: O sistema deve utilizar **exclusivamente** o **Font Awesome** para todos os ícones. O uso de Bootstrap Icons ou outras bibliotecas de ícones é proibido para manter a consistência visual.

5. **Proibição de Gambiarras & Tipagem Forte**: É estritamente proibido o uso de soluções temporárias para silenciar alertas (ex: `ngSkipOptimization`). Proibido o uso de `any` ou `as any`. Todo dado deve ser fortemente tipado via `interface` ou `type`.

6. **Reatividade Moderna (Signals Only)**: É proibido o uso de `BehaviorSubject` ou `Observable` para gerenciar estado simples de UI. Use obrigatoriamente **Signals** (`signal`, `computed`, `effect`). RxJS deve ser restrito apenas para chamadas de API no data-access. Modais devem usar `model()` para estado de exibição, `input()` para dados de entrada, e `output()` para eventos de confirmação/cancelamento.

6b. **Tempo Real (SignalR)**: Dados voláteis compartilhados entre usuários (ex.: agenda) são atualizados via hub SignalR do backend — **proibido polling por tempo**. Use o `AgendaHubService` (`core/services/agenda-hub.service.ts`): conecte no `ngOnInit`, observe o sinal `eventVersion` com `effect` para recarregar os dados, e desconecte no `ngOnDestroy`. A conexão usa cookie do usuário autenticado (`withCredentials: true`) e `automaticReconnect` com política de reconexão infinita (a cada 30s). **Exceção aprovada (agenda)**: o `CalendarioComponent` busca os agendamentos na API a cada 1 minuto (`setupRefreshTimer`, `REFRESH_INTERVAL_MS = 60_000`) e atualiza a tela no lugar, sem recarregar a página — a pedido explícito do usuário, para exibir sempre os dados mais recentes sem depender de tempo real. Não replicar esse padrão em outras telas sem aprovação.

6c. **Datas de Agendamento (sem fuso)**: Horários de agendamento seguem a convenção "hora local tratada como UTC" — **proibido converter fuso**. Ao exibir, monte o `Date` local a partir dos componentes do ISO (`agendamentoParaDateLocal` em `core/models/agenda.model.ts`); ao enviar, use a string crua `${yyyy}-${MM}-${dd}T${hh}:${mm}:00` **sem** `toISOString()`/`Z`. Usar `new Date(iso)` ou `toISOString()` desloca o horário em 3h.

7. **Injeção de Dependência (Function-based)**: Priorize o uso da função `inject()` em vez de injeção via `constructor`.

8. **Controle de Fluxo Built-in (Angular)**: Proibido o uso de `*ngIf`, `*ngFor` ou `*ngSwitch`. Use exclusivamente a nova sintaxe nativa do Angular (`@if`, `@for`, `@switch`).

9. **Componentes Standalone**: Todos os componentes, pipes e diretivas devem ser Standalone. O uso de `NgModule` é proibido.

10. **Performance & Imutabilidade**: Todos os componentes devem usar `ChangeDetectionStrategy.OnPush`. O estado deve ser tratado como imutável, usando métodos que retornem novas instâncias para atualização de sinais.

11. **Contrato de Interface (Public API)**: Na Library, apenas componentes/serviços exportados em `public-api.ts` devem ser acessíveis.

12. **Arquivos de Componente Separados**: Sempre que criar um componente, deve criar os arquivos `.html`, `.ts`, `.spec.ts` e `.scss` separadamente.

13. **Escopo de Código (Feature vs Compartilhado)**: Código específico de uma feature (componentes, modelos de configuração, pipes de formatação visual, helpers) deve ficar DENTRO da pasta `features/<nome-feature>/`. Código reutilizável entre features (serviços de API, modelos de domínio, pipes genéricos, guards, interceptors) deve subir para `core/` ou `shared/`. A regra é: **se só uma feature usa, fica na feature; se duas ou mais usam, sobe para core/shared**.

14. **Verificação de Library (Proatividade)**: Sempre verifique se um componente necessário já existe na Library do workspace (`TM-Angular-Library-Workspace`). Caso não exista e você identifique que seria um bom candidato a componente personalizado (reusável/premium), você **deve avisar o usuário** para decidirem entre criar na Lib ou seguir com implementação local.

14. **Documentação de Código (TypeScript)**: Documentar métodos, componentes e serviços em **pt-BR** utilizando JSDoc conciso (`/** ... */`). Documentar **apenas** quando houver contexto não-óbvio: pré-condições e permissões (ex: "Requer perfil de Administrador"), efeitos colaterais críticos (ex: "Dispara reset de senha e redireciona"), ou regras de negócio de interface. **Proibido** usar `@param` ou `@returns`. Métodos simples ou autoexplicativos **não** devem ser documentados. Use `//` comentários inline para lógica complexa. Use `// TODO:` para marcar código temporário ou agendado para expansão futura.

15. **Organização de Componentes**: Cada feature segue a estrutura de pastas obrigatória abaixo. O componente principal da feature fica em `components/<nome-feature>/`. Sub-componentes de detalhes ficam em `components/<nome-feature>-detalhes/<sub-componente>/`. Modais ficam em `components/modais/<nome-modal>/`. Componentes pai orquestram modais e chamadas de serviço; sub-componentes recebem dados via `input.required()` e emitem ações via `output()`.

16. **Separação de Models e Constantes**: Interfaces de modelo de domínio residem em `core/models/<entidade>/`. Interfaces de configuração específicas da feature residem em `models/` da própria feature. Constantes de configuração (ex: mapeamento de status para badge) usam `const RECORD` objects em arquivos de model, **não** enums do TypeScript. Enums ficam em `enums/` quando estritamente necessário.

17. **Helper Services por Feature**: Serviços auxiliares específicos de uma feature (formatação de badge, lógica de exibição) devem ser `@Injectable()` **sem** `providedIn: 'root'` e fornecidos no nível do componente via `providers: []`. Serviços de API (chamadas HTTP) e modelos de domínio compartilhados ficam em `core/services/` e `core/models/`.

18. **Pipes Específicos**: Pipes de formatação visual específicos de uma feature (ex: pipes de badge) devem ser `standalone: true`, `pure: true`, e injetar o helper service da feature via `inject()`. O tipo de entrada e saída do pipe deve ser definido no mesmo arquivo via `interface` exportada.

19. **Estrutura Canônica de Feature (Obrigatória)**: Toda nova feature DEVE seguir a estrutura abaixo. Cada pasta só deve ser criada se houver conteúdo correspondente, mas a estrutura conceitual é fixa:

```
features/<nome-da-feature>/
├── components/                          ← TODOS os componentes da feature
│   ├── <nome-da-feature>/               ← componente principal (lista/página)
│   │   ├── <nome-da-feature>.component.ts
│   │   ├── <nome-da-feature>.component.html
│   │   └── <nome-da-feature>.component.scss
│   ├── <nome-da-feature>-detalhes/      ← sub-página de detalhes (se houver)
│   │   └── <sub-componente>/
│   └── modais/                          ← modais extraídos em componentes separados
│       └── <nome-modal>/
│           ├── <nome-modal>.component.ts
│           ├── <nome-modal>.component.html
│           └── <nome-modal>.component.scss
├── models/                              ← interfaces/configs específicas da feature
│   └── <nome-config>.model.ts
├── pipes/                               ← pipes de formatação visual
│   └── <nome-pipe>.pipe.ts
└── services/                            ← helpers específicos (sem providedIn: 'root')
    └── <nome-helper>.service.ts
```

**Regras estruturais:**
- **`components/`** — OBRIGATÓRIO quando houver 2+ componentes na feature. Se houver apenas 1 componente (o principal), ele pode ficar na raiz da feature, mas se houver qualquer sub-componente, modal, ou página de detalhes, **TODOS** devem estar dentro de `components/`.
- **`models/`** — OBRIGATÓRIO se houver interfaces de configuração, constantes (`const RECORD`), ou tipos específicos da feature. Modelos de domínio compartilhados vão em `core/models/`.
- **`enums/`** — OBRIGATÓRIO se houver enums do TypeScript (apenas quando estritamente necessário).
- **`services/`** — OBRIGATÓRIO se houver lógica de formatação, regras de negócio específicas, ou transformações de dados que não sejam pipes.
- **`pipes/`** — OBRIGATÓRIO se houver lógica de exibição repetida (badges, status, formatação condicional) que justifique um pipe standalone.

**Checklist para criação de nova feature:**
1. Criar `core/models/<entidade>/<entidade>.model.ts` (modelo de domínio compartilhado)
2. Criar `core/services/<nome>.service.ts` (serviço de API com `providedIn: 'root'`)
3. Criar feature em `features/<nome>/` com `components/`, `models/`, `pipes/`, `services/` conforme necessidade
4. Extrair modais para `components/modais/` com `model()`, `input()`, `output()`
5. Extrair pipes para `pipes/` (standalone, pure, injetam helper service)
6. Criar helper service em `services/` se houver lógica de formatação
7. Registrar rota em `app.routes.ts` (lazy loading)
8. Adicionar menu em `menu.config.ts` se necessário
9. Adicionar traduções em `core/i18n/*.ts`
10. Atualizar `FUNCIONAL.md`

## Manutenção de Documentação

Sempre que alterar a arquitetura, padrões, regras de codificação ou estrutura deste projeto, atualize este arquivo (`AGENTS.md`) e o `README.md` do Groom-FE. Para alterações funcionais (telas, rotas, fluxos, regras de negócio), atualize o `FUNCIONAL.md` na raiz do monorepo.
