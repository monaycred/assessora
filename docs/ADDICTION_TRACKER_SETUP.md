# 🎯 Addiction Tracker — Setup & Implementação

Este documento guia o setup completo do módulo de Addiction Tracker no Iasmin.

---

## 📋 Checklist de Implementação

### **1. Database (Supabase)**
- [ ] Execute a migration SQL em `supabase/migrations/20260615_addiction_tracker.sql`
  ```bash
  supabase migration up
  ```
  Ou copie o SQL e execute direto no SQL Editor do Supabase dashboard

### **2. Arquivos Criados**

#### **Types & Interfaces**
- [x] `src/types/addiction.ts` — Tipos TypeScript (AddictionTracker, CommunityPost, etc)

#### **Bibliotecas & Utilitários**
- [x] `src/lib/addiction/utils.ts` — Funções auxiliares (calcular dias, gerar cidades, etc)
- [x] `src/lib/addiction/database.ts` — Funções Supabase (CRUD de trackers, posts, etc)

#### **API Routes**
- [x] `src/app/api/addiction/trackers/route.ts` — GET/POST trackers
- [x] `src/app/api/addiction/trackers/[id]/route.ts` — GET/PATCH tracker detalhes
- [x] `src/app/api/addiction/trackers/[id]/reset/route.ts` — POST reset (recaída)
- [x] `src/app/api/community/feed/route.ts` — GET/POST posts da comunidade
- [x] `src/app/api/community/ranking/route.ts` — GET ranking público
- [x] `src/app/api/addiction/cron/check-milestones/route.ts` — Cron job para verificar marcos

#### **Componentes React**
- [x] `src/components/addiction/TrackerCard.tsx` — Card mostrando tracker com cronômetro
- [x] `src/components/addiction/CommunityRanking.tsx` — Ranking público
- [x] `src/components/addiction/CommunityFeed.tsx` — Feed de posts da comunidade

#### **Páginas**
- [x] `src/app/(dashboard)/addiction/page.tsx` — Dashboard principal

---

## 🚀 Próximos Passos (O que falta)

### **Fase 1 — Essencial**

1. **[ ] Página de novo tracker** (`/addiction/novo`)
   - Form para criar tracker
   - Pedir: nome, descrição, meta, marcos customizados

2. **[ ] Página de edição** (`/addiction/[id]/editar`)
   - Permitir editar tracker
   - Mudar nome da comunidade
   - Ativar/desativar privacidade
   - Customizar notificações

3. **[ ] Página de notas/diário** (`/addiction/[id]/notas`)
   - Adicionar notas diárias
   - Adicionar métricas
   - Ver histórico

4. **[ ] Integração WhatsApp**
   - Modificar `src/lib/evolution/client.ts` para enviar notificações de marcos
   - Criar handlers de callback para confirmação (✅ Continuar / ❌ Recaí)
   - Integrar com webhook existente em `/api/webhook/evolution`

5. **[ ] Cron Job**
   - Configurar no Vercel ou usar n8n para chamar `/api/addiction/cron/check-milestones`
   - Chamar a cada 1 hora com `Bearer ${CRON_SECRET}`
   - Adicionar `CRON_SECRET` em `.env.local`

6. **[ ] Sidebar Menu**
   - Adicionar "🎯 Controle de Vícios" no menu lateral
   - Link para `/addiction`

---

### **Fase 2 — Funcionalidades da Comunidade**

1. **[ ] Componente CreatePost** 
   - Modal para criar novo post
   - Escolher tipo (vitória, desafio, dica)
   - Enviar POST para `/api/community/feed`

2. **[ ] Reações em posts**
   - Botões de reação (❤️ 💪 🔥)
   - POST `/api/community/posts/[id]/react`

3. **[ ] Comentários**
   - Expandir post para ver comentários
   - Adicionar comentário
   - POST `/api/community/posts/[id]/comment`

4. **[ ] Sistema de denúncias**
   - Menu "..." em cada post/comentário
   - Opção "🚩 Denunciar"
   - Modal com motivo da denúncia
   - POST `/api/community/posts/[id]/report`

5. **[ ] Dashboard de moderação** (admin only)
   - Página `/admin/addiction/reports`
   - Listar denúncias pendentes
   - Preview do post/comentário
   - Ações: Deletar, Avisar, Ignorar

---

### **Fase 3 — Notificações & Automação**

1. **[ ] Notificações diárias de manhã**
   - Cron job separado para executar no horário da notificação_time
   - Enviar WhatsApp: "Você está no dia X 💪"
   - Botão para adicionar nota

2. **[ ] Email digest**
   - Envio semanal com progresso
   - Posts da comunidade que inspiraram

3. **[ ] Push notifications** (PWA)
   - Quando atinge marcos
   - Quando novos comentários em seus posts

---

## 🛠️ Configurações Necessárias

### **.env.local**
```
# Supabase (já existente)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Cron Job
CRON_SECRET=seu-token-secreto-aqui

# OpenAI (para WhatsApp, já existente)
OPENAI_API_KEY=...

# Evolution API (para WhatsApp, já existente)
EVOLUTION_API_KEY=...
EVOLUTION_API_URL=...
```

### **Sidebar (src/components/layout/Sidebar.tsx)**
Adicionar link:
```tsx
<NavItem 
  href="/addiction" 
  icon={Target} 
  label="Controle de Vícios" 
/>
```

### **Vercel Cron** (para checkar marcos)
Criar arquivo `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/addiction/cron/check-milestones",
      "schedule": "0 * * * *"
    }
  ]
}
```

---

## 📝 Guia de Uso (Do Usuário)

### **Novo usuário**
1. Faz cadastro normal no Iasmin
2. Sistema cria automaticamente um tracker padrão "Novo Começo"
3. Tracker começa com cronômetro zerado
4. Iasmin envia WhatsApp: "Bem-vindo! Comecei a contar seus dias!"

### **Ao atingir 24h**
1. Sistema detecta marco de 1 dia
2. Iasmin envia: "🎉 DOU 24 HORAS! Confirma se continua? [✅][❌]"
3. Se ✅: próximo marco agendado
4. Se ❌: reseta, mostra histórico (melhor: X dias)

### **Adicionar nota diária**
1. Clica em "📝 Adicionar nota"
2. Form: notas, métricas (economizou R$, quantos não consumidos), humor
3. Salva na entrada do dia

### **Participar comunidade**
1. Vai em "⚙️ Configurar tracker"
2. Ativa "[ ] Aparecer na comunidade"
3. Define nome (padrão: cidade aleatória, pode customizar)
4. Agora aparece no ranking e feed

### **Postar na comunidade**
1. Clica "Novo post"
2. Escreve mensagem (máx 280 caracteres)
3. Escolhe tipo: ✨ Vitória, 💔 Desafio, 💡 Dica
4. Post aparece para todos

---

## 🧪 Testes Recomendados

### **Manual Tests**
- [ ] Criar tracker novo
- [ ] Editar tracker
- [ ] Adicionar nota
- [ ] Verificar cronômetro atualiza em tempo real
- [ ] Resetar tracker
- [ ] Aparecer/desaparecer da comunidade
- [ ] Postar na comunidade
- [ ] Reagir a posts
- [ ] Comentar em posts

### **Verificação Cron**
- [ ] Chamar `/api/addiction/cron/check-milestones` manualmente
- [ ] Verificar se milestones foram criados no banco
- [ ] Verificar logs

### **Dados Esperados**
- [ ] Tracker com 0 dias começa corretamente
- [ ] Milestone de 1 dia é criado após 24h
- [ ] Reset salva histórico corretamente
- [ ] Nomes randomicos são gerados

---

## 📊 Schema SQL (Já criado)

9 tabelas foram criadas:
1. `addiction_trackers` — Trackers principais
2. `addiction_milestones_reached` — Marcos atingidos
3. `addiction_entries` — Notas diárias
4. `addiction_resets` — Histórico de recaídas
5. `community_posts` — Posts da comunidade
6. `community_reactions` — Reações em posts
7. `community_comments` — Comentários em posts
8. `community_reports` — Denúncias
9. `community_warnings` — Avisos disciplinares

**Para verificar no Supabase:** Vá em SQL Editor → copie conteúdo de `supabase/migrations/20260615_addiction_tracker.sql` → execute

---

## 🎯 Prioridades

**Must Have (Semana 1):**
- Database criada
- API routes funcionando
- Dashboard básico (listar trackers)
- Novo tracker form
- Cron job checando marcos

**Should Have (Semana 2):**
- WhatsApp integration
- Comunidade básica (ranking + feed)
- Notas diárias

**Nice to Have (Depois):**
- Comentários
- Denúncias + moderação
- Badges/achievements

---

## 🔗 Arquivos Principais

```
src/
├── types/
│   └── addiction.ts ..................... ✅ Types
├── lib/addiction/
│   ├── utils.ts ........................ ✅ Utilitários
│   └── database.ts ..................... ✅ Supabase CRUD
├── app/api/addiction/
│   ├── trackers/
│   │   ├── route.ts ................... ✅ GET/POST
│   │   └── [id]/
│   │       ├── route.ts .............. ✅ GET/PATCH
│   │       └── reset/
│   │           └── route.ts .......... ✅ POST reset
│   └── cron/
│       └── check-milestones/route.ts . ✅ Cron job
├── app/api/community/
│   ├── feed/route.ts .................. ✅ GET/POST posts
│   └── ranking/route.ts ............... ✅ GET ranking
├── components/addiction/
│   ├── TrackerCard.tsx ................ ✅ Card do tracker
│   ├── CommunityRanking.tsx ........... ✅ Ranking
│   └── CommunityFeed.tsx .............. ✅ Feed
└── app/(dashboard)/addiction/
    └── page.tsx ....................... ✅ Dashboard

supabase/
└── migrations/
    └── 20260615_addiction_tracker.sql . ✅ Database
```

---

## 💡 Dicas

1. **Testar localmente:** `npm run dev` e acesse `http://localhost:3001/addiction`
2. **Ver logs:** Verifique console do navegador (Dev Tools) e terminal
3. **Resetar database:** No Supabase, vá em SQL Editor e delete as tabelas
4. **Verificar dados:** SQL Editor → selecione `SELECT * FROM addiction_trackers`

---

## 📞 Suporte

Dúvidas? Revise:
- `docs/specs/2026-06-15-addiction-tracker-design.md` — Design completo
- `CLAUDE.md` — Instruções do projeto (se existir)
- Schema SQL em `supabase/migrations/` — Estrutura do banco

---

**Status:** 🚀 **Pronto para implementação da Fase 1!**

Próximo: Implementar formulário de novo tracker e página de edição.
