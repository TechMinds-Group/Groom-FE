# Guia de Arquitetura e Padrões Frontend (Groom-FE)

Este documento é o **guia mestre de arquitetura do frontend** (`Groom-FE`). Ele estabelece as regras obrigatórias e os padrões de organização de código que devem ser seguidos rigorosamente ao criar novas features ou refatorar módulos existentes.

---

## 1. Organização de Camadas e Responsabilidades

A aplicação é dividida em três pilares fundamentais: `core`, `shared` e `features`.

```
src/app/
├── core/                  # Serviços globais de infraestrutura, autenticação e comunicação com a API REST
├── shared/                # Componentes, pipes, directives, models e helpers reutilizáveis em 2+ telas
└── features/              # Módulos funcionais específicos de cada domínio de negócio (ex: usuarios, agendamentos)
```

---

### 1.1. Camada `core` (`src/app/core/`)

A camada `core` contém os elementos singleton de infraestrutura global do sistema.

#### **Serviços HTTP REST (`src/app/core/services/`)**
> 🚨 **REGRA IMPERATIVA**: Os serviços em `core/services/` devem conter **SOMENTE E APENAS** chamadas de requisição HTTP REST ao backend (`HttpClient`).

- **Permitido**: `http.get`, `http.post`, `http.put`, `http.delete`, gerenciamento de sinais de estado da store de API.
- **PROIBIDO**: Lógica de negócio, regras de formatação de UI, manipulação de cores/ícones, validações de formulário.

#### **Modelos de Domínio (`src/app/core/models/`)**
- Interfaces e tipos TypeScript globais que espelham diretamente os DTOs e Entidades expostos pela API backend.

---

### 1.2. Camada `shared` (`src/app/shared/`)

A camada `shared` armazena recursos reutilizáveis por **mais de uma tela/feature** ou com potencial claro de reuso.

- **`shared/components/`**: Componentes reutilizáveis (ex: cards genéricos, tabelas padrão, botões estilizados, headers).
- **`shared/pipes/`**: Pipes de formatação genéricos utilizados em vários locais (ex: `TranslatePipe`, formatação de moeda, datas, CPF/CNPJ).
- **`shared/directives/`**: Diretivas de comportamento genéricas (ex: máscaras de input, foco automático).
- **`shared/services/`**: Services de suporte de UI ou utilitários que atendem a múltiplos módulos.
- **`shared/models/`**: Interfaces e tipos reutilizáveis no ecossistema compartilhado.

---

### 1.3. Camada `features` (`src/app/features/<nome-feature>/`)

Contém tudo o que é **específico de uma única feature/tela de negócio**. Nada que esteja dentro de uma pasta de feature deve ser dependência direta de outra feature.

#### **Estrutura Padrão de uma Feature (`src/app/features/<nome-feature>/`)**

```
src/app/features/<nome-feature>/
├── components/
│   ├── <nome-feature>/              # Componente principal da página de listagem / dashboard
│   ├── <feature>-detalhes/          # Orquestrador (Smart Component) da tela de detalhes
│   │   ├── <feature>-detalhes/      # Smart Component
│   │   ├── <feature>-detalhes-geral/# Dumb Component para exibição de dados
│   │   └── <feature>-detalhes-acoes/# Dumb Component para botões de ação
│   └── modais/                      # Modais especialistas auto-contidos
│       ├── <feature>-modal-criar/   # Modal de criação/cadastro
│       ├── <feature>-modal-editar/  # Modal de edição
│       └── <feature>-modal-excluir/ # Modal de confirmação de remoção
├── models/                          # Interfaces e tipos exclusivos de apresentação da feature
├── pipes/                           # Pipes de formatação visual exclusivos da feature
└── services/                        # Helper/Presenter de UI específico da feature (ex: formatação de badges, ícones)
```

---

## 2. Convenções Tecnológicas e Boas Práticas

Ao criar ou editar qualquer código no `Groom-FE`, os seguintes padrões tecnológicos devem ser seguidos:

1. **Angular Standalone Components**:
   - Todos os componentes devem ser `standalone: true`.
   - Importar apenas as dependências necessárias no array `imports`.

2. **Injeção de Dependências**:
   - Utilizar a função `inject()` em vez de injeção por construtor.
   - Exemplo: `private readonly http = inject(HttpClient);`.

3. **Gerenciamento de Estado Reativo (Angular Signals)**:
   - Utilizar `signal()`, `computed()` e `asReadonly()` para gerenciamento de estado local e reatividade limpa.
   - Evitar `BehaviorSubject` ou RxJS em componentes a menos que haja operadores complexos.

4. **Estratégia de Detecção de Mudanças**:
   - Todos os componentes devem declarar `changeDetection: ChangeDetectionStrategy.OnPush`.

5. **Padrão Smart vs. Dumb Components**:
   - **Smart Components (Pai/Container)**: Injetam serviços, gerenciam a rota, escutam eventos de modais e realizam chamadas à API.
   - **Dumb Components (Filhos/Presentation)**: Recebem dados via Inputs e apenas emitem intenções via Outputs. Sem injeção de serviços de API.

6. **Desacoplamento de Modais**:
   - Cada modal deve ser criado como um componente isolado na subpasta `components/modais/`.
   - Modais não devem conter lógica de listagem global; eles recebem dados para edição via formulário e emitem o payload pronto para salvar.

---

## 3. Checklist para Criação de uma Nova Feature

Ao iniciar a implementação de uma nova funcionalidade (ex: `agendamentos`):

- [ ] **1. API Core Service**:
  - Criar `src/app/core/services/agendamentos.service.ts`.
  - Contém **apenas** métodos HTTP REST puros.

- [ ] **2. Domain Models**:
  - Criar DTOs e interfaces em `src/app/core/models/agendamentos/`.

- [ ] **3. Feature Folder**:
  - Criar a pasta `src/app/features/agendamentos/`.

- [ ] **4. Modais Especialistas**:
  - Criar modais reutilizáveis e isolados em `src/app/features/agendamentos/components/modais/`.

- [ ] **5. Helper de UI (se necessário)**:
  - Se houver mapeamento de status, badges, cores Hex ou ícones exclusivos, criar `AgendamentosHelperService` em `features/agendamentos/services/`.

- [ ] **6. Verificação de Reuso (`shared`)**:
  - Se identificar um pipe, modal genérico ou formatador utilizado por 2+ telas, mover/criar diretamente em `src/app/shared/`.
