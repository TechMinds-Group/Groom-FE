# Shared Module (`src/app/shared`)

**Objetivo**
Servir como biblioteca utilitária base, disponibilizando recursos puros (lógicas reutilizáveis genéricas e blocos visuais atômicos) que operam em múltiplas camadas do sistema sem conhecimento de onde estão importados.

**O que DEVE entrar aqui:**
- Elementos visuais agnósticos de estado (Dumb Components).
- Transformadores e Manipuladores do DOM que não estão acoplados a uma arquitetura específica.

**O que NÃO deve entrar aqui:**
- Serviços e infraestruturas marcadas com regra de negócio profunda (Domain Logic).
- Componentes que precisam injetar e depender de roteamento central (`Router`), Store Services ou acesso ativo à API diretamente do template.
