# AprovaMed Planner — PRD

## Original problem
Aplicativo web/mobile para estudantes brasileiros do 3º ano focados em Medicina/ENEM/UFU/UNIMONTES/UFMG. Pergunta-chave: **"O que eu preciso estudar hoje?"**

## Stack
- **Backend**: FastAPI + Motor (async MongoDB) + JWT (Bearer) + bcrypt
- **Frontend**: React + react-router + TailwindCSS + shadcn/ui + recharts + sonner + lucide-react
- **DB**: MongoDB (collections: users, profiles, tasks, revisoes, schedule, questoes, redacoes, simulados, vestibulares)
- **Design**: Neo-brutalist (Outfit + Figtree, hard borders, block shadows, pastel subject colors, light + dark)

## Core requirements (static)
- Auth: register/login (email+senha) com JWT
- Onboarding: vestibular-alvo, data prova, horas/dia, matérias fortes/fracas, conteúdos atrasados, metas
- Sistema de matérias e frentes (Mat A/B/C, Fis A/B/C, etc.)
- 8 abas funcionais (Dashboard, Estudar Hoje, Revisões, Cronograma, Questões, Redação, Simulados, Vestibulares)
- CRUD completo (criar, editar, excluir, marcar concluído) em todas as entidades
- Mobile-first com bottom nav + sidebar desktop
- Modo escuro toggleable
- pt-BR + datas DD/MM/AAAA

## User personas
1. **Vestibulando 17-19 anos** (Medicina) — usuário primário
2. **Estudante reformulando rotina** após simulado fraco

## What's been implemented (2026-02-27)
- ✅ JWT auth (register/login/me) + demo seed (`demo@aprovamed.com` / `demo123`)
- ✅ 8 abas com CRUD completo + edição + delete + marcar concluído
- ✅ Dashboard agregado (`GET /api/dashboard`)
- ✅ Sistema de revisões com semana 1/2 + histórico
- ✅ Cronograma diário editável por dia (date picker)
- ✅ Computed fields: erros/percentual em questões e simulados; nota_total em redação
- ✅ Recharts: evolução de redação e simulados
- ✅ Theme toggle persistente (localStorage)
- ✅ Demo data: 5 tarefas, 4 revisões, 4 blocos cronograma, 8 registros de questões, 3 redações, 3 simulados, 3 vestibulares
- ✅ Testing agent: 20/20 backend pass · 100% frontend

## Backlog / Next
**P1**
- [ ] Configurações: editar perfil/metas (já existe via `/api/profile`, criar tela)
- [ ] Pomodoro timer integrado em "Estudar Hoje"
- [ ] Filtros por matéria nas listas (Questões, Redação, Simulados)
- [ ] Gráfico de % acerto por matéria em Questões
- [ ] Notificações/lembretes diários

**P2**
- [ ] Exportar plano semanal em PDF
- [ ] Compartilhar progresso (link público)
- [ ] Banco de questões integrado (importar de PDFs)
- [ ] Streak/gamificação (dias seguidos estudando)
- [ ] Multi-perfil (alternar planos)

## Auth
- Storage: `localStorage['aprovamed_token']`
- Header: `Authorization: Bearer <jwt>`
- Endpoints under `/api/auth/*`

## Known notes
- POST `/api/questoes2` `/api/redacoes2` `/api/simulados2` são endpoints de criação que computam campos derivados (erros, percentual, nota_total). PUT/DELETE/GET via `/api/questoes` etc.
