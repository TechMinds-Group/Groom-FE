# Especificação Técnica da Feature de Usuários (`src/app/features/usuarios`)

Este documento descreve detalhadamente as especificações funcionais, regras de negócio, fluxos de tela e mapeamento de componentes do módulo de **Gestão de Usuários** no frontend (`Groom-FE`).

---

## 1. Visão Geral da Feature

O módulo de usuários é responsável por fornecer a interface para administração e auto-gestão de contas de usuários no sistema.

### **Casos de Uso Suportados**
1. **Listagem de Usuários**: Visualização em tabela com badges de perfil e status.
2. **Filtro de Segurança e Visibilidade**:
   - **Administradores**: Possuem visão completa de **todos** os usuários cadastrados no sistema.
   - **Usuários Comuns**: Visualizam **apenas o próprio perfil** na listagem e na tela de detalhes.
3. **Detalhes do Usuário (`/gestao/usuarios/:id`)**: Exibição dos dados cadastrais, plano de assinatura associado e botões de ação restritos.
4. **Novo Usuário**: Cadastro de novas contas com seleção de até 2 níveis de acesso (primário e secundário) e status inicial.
5. **Edição Cadastral**: Alteração de nome, e-mail, níveis de acesso e status.
6. **Alteração e Reset de Senha**:
   - **Troca Regular**: Usuário informa a senha atual e define a nova senha.
   - **Reset Administrativo**: Administrador aciona o reset de um usuário e recebe uma senha temporária gerada pelo backend.
7. **Exclusão de Usuário**: Remoção de conta mediante confirmação em modal dedicado.

---

## 2. Matriz de Permissões (RBAC na Interface)

| Funcionalidade / Ação | Administrador (`isAdmin = true`) | Usuário Comum (`isAdmin = false`) |
| :--- | :---: | :---: |
| **Visualizar Lista de Usuários** | Todos os usuários do sistema | Apenas o próprio usuário logado |
| **Visualizar Detalhes** | Qualquer usuário | Apenas o próprio perfil (`id == currentUserId`) |
| **Cadastrar Novo Usuário** | ✅ Permitido | ❌ Bloqueado |
| **Editar Dados Cadastrais** | Qualquer usuário (incluindo perfis/status) | Apenas nome/e-mail do próprio perfil |
| **Resetar Senha de Terceiros** | ✅ Permitido (gera senha temporária) | ❌ Bloqueado |
| **Alterar Própria Senha** | ✅ Permitido (exige senha atual) | ✅ Permitido (exige senha atual) |
| **Excluir Usuário** | ✅ Permitido | ❌ Bloqueado |

---

## 3. Mapeamento de Componentes e Estrutura Interna

```
src/app/features/usuarios/
├── components/
│   ├── modais/
│   │   ├── usuario-modal-alterar-senha/   # Modal de troca própria ou reset administrativo de senha
│   │   ├── usuario-modal-editar/          # Modal de edição de dados e perfis do usuário
│   │   └── usuario-modal-excluir/         # Modal de confirmação de exclusão
│   ├── usuario-detalhes/
│   │   ├── usuario-detalhes/              # Smart Component (Container) da tela de detalhes (/gestao/usuarios/:id)
│   │   ├── usuario-detalhes-acoes/        # Dumb Component com os botões de ação (Editar, Senha, Excluir)
│   │   └── usuario-detalhes-geral/        # Dumb Component com o card de informações do usuário
│   └── usuarios/                          # Componente da página principal de listagem de usuários
├── models/
│   ├── perfil-badge-config.model.ts       # Interface da configuração visual do badge de perfil
│   ├── status-badge-config.model.ts       # Interface da configuração visual do badge de status
│   └── status-configs.model.ts            # Estilos constantes de status (Ativo / Inativo)
├── pipes/
│   ├── perfil-badge.pipe.ts               # Pipe que transforma strings/IDs de perfis em badges estilizados
│   └── status-badge.pipe.ts               # Pipe que transforma status em badges coloridos
└── services/
    └── usuarios-helper.service.ts         # Helper de UI para formatação de ícones, cores Hex e rótulos
```

---

## 4. Detalhamento dos Componentes

### 4.1. Listagem de Usuários (`UsuariosComponent`)
- **Rota**: `/gestao/usuarios`
- **Responsabilidade**: Exibir a tabela principal de usuários (`TmTableComponent`), tratar a criação de novos usuários via modal e redirecionar para a tela de detalhes.
- **Destaques**:
  - Utiliza `computed()` com o `LanguageService` para tradução reativa dos cabeçalhos da tabela.
  - Exibe o botão **"Novo Usuário"** apenas se `isAdmin()` for verdadeiro.

### 4.2. Tela de Detalhes (`UsuarioDetalhesComponent`)
- **Rota**: `/gestao/usuarios/:id`
- **Padrão**: Smart Component que gerencia os modais de edição, alteração de senha e exclusão.
- **Subcomponentes**:
  - `UsuarioDetalhesGeralComponent` (Dumb): Exibe a foto/avatar, nome, e-mail, badges de perfil/status e plano de assinatura.
  - `UsuarioDetalhesAcoesComponent` (Dumb): Exibe os botões de ação respeitando as permissões do usuário logado.

### 4.3. Modais Especialistas (`components/modais/`)
1. **`usuario-modal-editar`**:
   - Permite alterar nome, e-mail, status e selecionar até 2 níveis de acesso (primário e secundário).
   - Usuários não-administradores possuem os campos de perfil e status desabilitados.
2. **`usuario-modal-alterar-senha`**:
   - Quando acionado para o próprio usuário, solicita a senha atual e a nova senha.
   - Quando acionado por um Administrador para outro usuário, exibe a opção de reset com senha temporária.
3. **`usuario-modal-excluir`**:
   - Exibe confirmação com o nome do usuário antes de efetuar a chamada de exclusão.

---

## 5. Serviços e Consumo de API

- **`UsuariosService` (`src/app/core/services/usuarios.service.ts`)**:
  - `carregarUsuarios()`: `GET /api/usuarios`
  - `carregarNiveis()`: `GET /api/usuarios/niveis`
  - `adicionar(usuario)`: `POST /api/usuarios`
  - `atualizar(id, dados)`: `PUT /api/usuarios/{id}`
  - `remover(id)`: `DELETE /api/usuarios/{id}`
  - `resetarSenha(id)`: `POST /api/usuarios/{id}/reset-password`
  - `alterarSenha(id, dados)`: `PUT /api/usuarios/{id}/change-password`

- **`UsuariosHelperService` (`src/app/features/usuarios/services/usuarios-helper.service.ts`)**:
  - `getPerfilBadgeConfigs(perfilStr, corHex, iconeClass)`: Mapeia perfis (`Administrador`, `Operador`, `Profissional`) para badges estilizados (`bg-danger-subtle`, `bg-primary-subtle`, `bg-secondary-subtle`) com ícones FontAwesome (`fas fa-shield-alt`, `fas fa-desktop`, `fas fa-user-tie`).
