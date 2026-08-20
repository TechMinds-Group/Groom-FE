# Groom FE

Frontend web do Groom (Angular + TypeScript). Sistema de gestão de agendamentos de barbearia, com agendamento online para clientes e integração WhatsApp.

## Stack

- Angular (standalone components, signals, control flow nativo)
- Bootstrap + Angular Material
- TM Angular Library (`tm-*` components)
- Font Awesome (ícones)
- SignalR (`@microsoft/signalr`) para atualização em tempo real da agenda

## Estrutura

- `src/app/core/` — serviços de API, modelos de domínio, guards, interceptors
- `src/app/features/<feature>/` — componentes, modais, pipes e helpers por feature
- `src/app/shared/` — código reutilizável entre features

## Desenvolvimento

```bash
npm install
npm start
```

Acessar: `http://localhost:4200` (proxy da API em `http://localhost:5000`).

## Tempo Real (SignalR)

O `AgendaHubService` (`src/app/core/services/agenda-hub.service.ts`) mantém a conexão com `/hubs/agenda` da API (autenticação via cookie) e expõe o sinal `eventVersion`, incrementado a cada evento `AgendamentosAlterados` recebido. Telas que consomem dados voláteis (ex.: agenda) observam esse sinal e recarregam os dados — sem polling por tempo. O serviço usa `automaticReconnect` e falhas de conexão não derrubam a tela.