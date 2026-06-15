# 🎯 ADDICTION TRACKER — DESIGN SPECIFICATION

**Data:** 15 de Junho de 2026  
**Projeto:** Iasmin — Assessora Virtual  
**Status:** Design Aprovado  
**Autor:** Gedaías

---

## 1. VISÃO GERAL

O **Addiction Tracker** é um módulo gratuito e comunitário para rastreamento de comportamentos/vícios integrado ao Iasmin. Funciona com:

- **Ativação automática:** Novo usuário = novo tracker criado automaticamente
- **Cronômetro contínuo:** Rastreia dias sem consumir/comportamento
- **Marcos motivadores:** Notificações em 24h, 3d, 7d, 10d, 15d, 20d, 30d, 45d, 60d, etc
- **Comunidade anônima:** Ranking com pseudônimos escolhidos pelo usuário (padrão: cidades aleatórias)
- **Feed social:** Posts de apoio com reações e comentários
- **Sem custo de tokens:** Apenas contadores e notificações, nenhuma IA envolvida

---

## 2. REQUISITOS FUNCIONAIS

### 2.1 Tracker Pessoal

**RF-1: Criação automática ao cadastro**
- Ao registrar novo usuário no Iasmin, criar automaticamente um tracker padrão
- Nome padrão: "Novo Começo"
- Status: ativo
- Campos inicializados:
  - `started_at` = timestamp atual
  - `current_streak_days` = 0
  - `best_streak_days` = 0
  - `attempt_count` = 0
  - `is_active` = true
  - `is_public` = false (opt-in)
  - `notification_time` = "07:00"
  - `custom_milestones` = [24h, 3d, 7d, 10d, 15d, 20d, 30d, 45d, 60d]
  - `community_name` = cidade aleatória gerada
  - `community_name_custom` = null (até usuário mudar)

**RF-2: Múltiplos trackers por usuário**
- Usuário pode criar N trackers (sem fumar, sem beber, sem açúcar, etc)
- Cada tracker é independente (cronômetros, marcos, comunidade separada)
- Cada tracker pode ter seu próprio nome na comunidade

**RF-3: Customização de marcos**
- Usuário pode adicionar/remover/editar marcos no dashboard
- Marcos customizados salvos em `custom_milestones` (JSON array)
- Exemplo: [12h, 2d, 5d, 10d, 20d, 50d]

**RF-4: Customização de notificação**
- Usuário escolhe hora da notificação diária (padrão: 07:00)
- Campo: `notification_time` (formato HH:MM)
- Respeitando timezone do usuário

**RF-5: Meta pessoal**
- Ao criar tracker, usuário define meta inicial (7d, 30d, 90d, 1 ano, sem limite, customizar)
- Campo: `goal_days` (integer ou null para sem limite)
- Dashboard mostra progresso até meta (barra, percentual, dias faltando)
- Ao atingir meta → notificação especial celebrando

**RF-6: Notas e diário**
- Usuário pode adicionar notas diárias (máx 500 caracteres)
- Campos: `notes` (texto), `date` (data), `mood` (1-5 opcional)
- Exemplo: "Passei por um gatilho no trabalho mas consegui resistir"

**RF-7: Métricas customizáveis**
- Usuário define quais métricas rastrear por tracker
- Exemplos: "economizei R$", "quantos não consumidos", "frequência"
- Salvo em `metrics` (JSON: {metric_name: value})
- Exemplo: {"saved_money": 150, "not_consumed": 30}

**RF-8: Histórico com progressão**
- Mostra todos os marcos já atingidos com datas
- Mostra melhor streak (`best_streak_days`)
- Mostra tentativas (`attempt_count`)
- Exemplo: "Melhor: 89 dias | Tentativa 3"

---

### 2.2 Marcos e Notificações

**RF-9: Triggers de marcos**
- Sistema calcula dias decorridos: `current_streak_days = (agora - started_at) / 86400`
- Quando `current_streak_days` atinge um marco em `custom_milestones`:
  1. Cria entry em `addiction_milestones_reached`
  2. Envia notificação WhatsApp com botões de confirmação
  3. Aguarda resposta do usuário

**RF-10: Notificação de marcos no WhatsApp**
- Formato: "🎉 DOU X HORAS/DIAS! [mensagem customizada]\nVamos que deu certo, continua no compromisso?\n[✅ Continuar] [❌ Recaí]"
- Mensagens customizadas por marco (24h, 3d, 7d, etc)
- Botões com callbacks para confirmar/falhar

**RF-11: Confirmação de marco**
- Se usuário clica [✅ Continuar]:
  - Salva `confirmed_at` em `addiction_milestones_reached`
  - Agenda próximo marco automaticamente
  - Se tracker é público, publica no feed: "Barcelona atingiu 7 dias! 🎉"
- Se usuário clica [❌ Recaí]:
  - Cria entry em `addiction_resets` (streak_before, reset_at, reason)
  - Reseta `current_streak_days = 0`
  - Incrementa `attempt_count++`
  - Mostra no ranking com status visual diferente
  - Oferece botão para recomeçar imediatamente

**RF-12: Confirmação diária na comunidade**
- Notificação diária de manhã (hora customizável):
  - Se tracker é público: "Barcelona! Você está no dia X 💪"
  - Com botão para adicionar nota/métrica
  - Com botão para confirmar que continua

---

### 2.3 Comunidade e Ranking

**RF-13: Opt-in na comunidade**
- Campo: `is_public` (boolean, padrão false)
- Usuário escolhe na aba "Privacidade" se quer aparecer no ranking
- Se false: dados privados, não aparece em lugar nenhum

**RF-14: Nome na comunidade**
- Cada tracker tem `community_name` (cidade aleatória gerada)
- Usuário pode customizar clicando [✏️ Escolher outro nome]
- Campo: `community_name_custom` (string, máx 20 caracteres)
- Se `community_name_custom` preenchido, usar esse; senão usar `community_name` (cidade)
- Validação: sem palavrões, sem @, sem dados pessoais identifíáveis
- Moderação: admin revisa nomes inapropriados

**RF-15: Ranking público**
- Mostra top 10 trackers ordenados por `current_streak_days` DESC
- Colunas: posição, nome na comunidade, dias atuais, melhor streak
- Se usuário recaiu (reset recente): nome aparece cinzento/menor, marcado como "❌ Recomeçou"
- Mostra totais: número de pessoas na comunidade, dias acumulados

**RF-16: Feed de posts**
- Usuários podem postar mensagens (máx 280 caracteres)
- Tipos de post: "victory" (vitória), "challenge" (desafio), "tip" (dica), "general"
- Cada post pertence a um tracker
- Posts mostra: nome_comunidade + dias_atuais + tipo + conteúdo + data
- Filtros: [Tudo] [✨ Vitórias] [💔 Desafios] [💡 Dicas]

**RF-17: Reações nos posts**
- Usuários podem reagir com emojis: ❤️, 💪, 🔥 (outros?)
- Sistema conta e agrupa reações
- Display: "❤️ 23  💪 45  🔥 12"

**RF-18: Comentários nos posts**
- Usuários podem comentar em posts
- Comentário mostra: nome_comunidade + dias_atuais + conteúdo + data
- Suporta replies (aninhados até 2 níveis)
- Comentários deletados mostram "[deletado]" para manter contexto

---

### 2.4 Moderação

**RF-19: Sistema de denúncias**
- Usuários podem reportar posts/comentários inapropriados
- Motivos: "spam", "conteúdo prejudicial", "bullying", "outro"
- Denúncia anônima (não mostra quem reportou)
- Cria entry em `community_reports` com status "pending"

**RF-20: Revisão manual de denúncias**
- Dashboard de moderação (seu painel):
  - Lista denúncias pendentes
  - Preview do post/comentário
  - Número de denúncias recebidas
  - Ações: [Deletar] [Avisar usuário] [Ignorar denúncia]
- Registro: quem aprovou, quando, notas

**RF-21: Avisos e restrições progressivas**
- 1º aviso: enviar mensagem no app ("Notamos conteúdo prejudicial...")
- 2º aviso: deletar post + restrição por 7 dias (vê comunidade mas não posta)
- 3º aviso: deletar post + restrição por 30 dias
- Reincidência: ban permanente do tracker/comunidade

**RF-22: Posts deletados**
- Post deletado mostra "[deletado por moderação]" (mantém contexto)
- Comentários do post deletado também somem
- Razão visível só para você (mod notes)

---

## 3. MODELO DE DADOS (BANCO)

### 3.1 Tabela: `addiction_trackers`

```sql
CREATE TABLE addiction_trackers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  
  -- Tracker info
  name TEXT NOT NULL, -- "Sem beber", "Sem fumar"
  description TEXT,
  
  -- Cronômetro
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_streak_days INTEGER NOT NULL DEFAULT 0,
  best_streak_days INTEGER NOT NULL DEFAULT 0,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  
  -- Configurações
  notification_time TIME NOT NULL DEFAULT '07:00',
  custom_milestones JSONB DEFAULT '[86400, 259200, 604800, 864000, 1296000, 1728000, 2592000, 3888000, 5184000]', -- 24h, 3d, 7d, 10d, 15d, 20d, 30d, 45d, 60d em segundos
  goal_days INTEGER, -- null = sem limite
  
  -- Comunidade
  is_public BOOLEAN NOT NULL DEFAULT false,
  community_name TEXT NOT NULL, -- cidade aleatória
  community_name_custom TEXT, -- nome customizado pelo usuário
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addiction_trackers_user_id ON addiction_trackers(user_id);
CREATE INDEX idx_addiction_trackers_is_public ON addiction_trackers(is_public);
```

### 3.2 Tabela: `addiction_milestones_reached`

```sql
CREATE TABLE addiction_milestones_reached (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  milestone_days INTEGER NOT NULL, -- 1, 3, 7, etc
  reached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ, -- quando usuário confirmar
  user_confirmed BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_milestones_tracker_id ON addiction_milestones_reached(tracker_id);
```

### 3.3 Tabela: `addiction_entries` (notas/diário)

```sql
CREATE TABLE addiction_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  entry_date DATE NOT NULL,
  notes TEXT, -- máx 500 chars
  metrics JSONB, -- {"saved_money": 150, "not_consumed": 30, ...}
  mood INTEGER, -- 1-5
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entries_tracker_id ON addiction_entries(tracker_id);
CREATE INDEX idx_entries_date ON addiction_entries(entry_date);
```

### 3.4 Tabela: `addiction_resets` (histórico de falhas)

```sql
CREATE TABLE addiction_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  streak_before INTEGER NOT NULL, -- quantos dias tinha
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT, -- opcional
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_resets_tracker_id ON addiction_resets(tracker_id);
```

### 3.5 Tabela: `community_posts`

```sql
CREATE TABLE community_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL, -- máx 280 chars
  post_type TEXT NOT NULL CHECK (post_type IN ('victory', 'challenge', 'tip', 'general')),
  
  -- Denormalizado para ranking (otimização)
  community_name TEXT NOT NULL,
  current_streak_days INTEGER NOT NULL,
  
  -- Moderação
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_reason TEXT,
  deleted_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_posts_tracker_id ON community_posts(tracker_id);
CREATE INDEX idx_posts_is_deleted ON community_posts(is_deleted);
CREATE INDEX idx_posts_created_at ON community_posts(created_at DESC);
```

### 3.6 Tabela: `community_reactions`

```sql
CREATE TABLE community_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('❤️', '💪', '🔥')), -- expandir se necessário
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(post_id, tracker_id, reaction_type) -- um usuário só pode reagir uma vez por emoji
);

CREATE INDEX idx_reactions_post_id ON community_reactions(post_id);
```

### 3.7 Tabela: `community_comments`

```sql
CREATE TABLE community_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL, -- máx 280 chars
  
  -- Denormalizado
  community_name TEXT NOT NULL,
  current_streak_days INTEGER NOT NULL,
  
  -- Moderação
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_reason TEXT,
  deleted_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON community_comments(post_id);
CREATE INDEX idx_comments_parent_id ON community_comments(parent_comment_id);
```

### 3.8 Tabela: `community_reports` (denúncias)

```sql
CREATE TABLE community_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES community_comments(id) ON DELETE CASCADE,
  
  reported_by_tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harmful', 'bullying', 'other')),
  reason_details TEXT,
  
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'deleted', 'false_report')),
  
  reviewed_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reports_status ON community_reports(status);
CREATE INDEX idx_reports_post_id ON community_reports(post_id);
CREATE INDEX idx_reports_comment_id ON community_reports(comment_id);
```

### 3.9 Tabela: `community_warnings` (avisos disciplinares)

```sql
CREATE TABLE community_warnings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tracker_id UUID NOT NULL REFERENCES addiction_trackers(id) ON DELETE CASCADE,
  
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harmful_content', 'bullying')),
  action TEXT NOT NULL CHECK (action IN ('warning', 'post_restriction', 'full_ban')),
  
  warning_count INTEGER NOT NULL DEFAULT 1, -- número do aviso (1º, 2º, 3º)
  
  restriction_until TIMESTAMPTZ, -- NULL = permanente
  
  issued_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT, -- sempre você (admin)
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  can_appeal BOOLEAN NOT NULL DEFAULT false, -- depois implementa se quiser
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_warnings_tracker_id ON community_warnings(tracker_id);
CREATE INDEX idx_warnings_restriction_until ON community_warnings(restriction_until);
```

---

## 4. FLUXOS PRINCIPAIS

### 4.1 Fluxo de Cadastro

```
1. Usuário faz POST /api/auth/register
2. Sistema cria user_profiles
3. **Trigger automático**: cria addiction_tracker com:
   - name = "Novo Começo"
   - started_at = NOW()
   - community_name = random_city()
   - is_active = true, is_public = false
4. Envia WhatsApp: "Bem-vindo! Comecei a contar seus dias!"
5. Usuário vê dashboard com tracker criado
```

### 4.2 Fluxo de Marco Atingido

```
Cronômetro roda continuamente (job/cron):
  a cada hora: SELECT trackers WHERE is_active=true
  
Para cada tracker:
  days = (NOW() - started_at) / 86400
  
  Se days ≥ marco em custom_milestones E não foi atingido:
    1. INSERT addiction_milestones_reached
    2. Envia WhatsApp com mensagem customizada + botões
    3. Aguarda callback (✅ ou ❌)
    
Se ✅ Continuar:
    a. UPDATE milestones_reached.confirmed_at = NOW()
    b. INSERT em feed: "Barcelona atingiu 7 dias! 🎉" (se public)
    c. Agendar próximo marco
    
Se ❌ Recaí:
    a. INSERT addiction_resets
    b. UPDATE tracker: current_streak_days=0, attempt_count++
    c. Mostrar no ranking com status visual
    d. Oferecer recomeçar
```

### 4.3 Fluxo de Notificação Diária

```
Job roda diariamente no horário escolhido (timezone-aware):
  SELECT trackers WHERE is_active=true AND notification_time=NOW_TIME
  
Para cada tracker:
  Envia WhatsApp:
  "Barcelona! Você está no dia {current_streak_days} 💪
   
   [📝 Adicionar nota] [✅ Confirmar]"
   
Se clica Adicionar nota → abre app com modal
Se clica Confirmar → registra entrada de hoje (se não existe)
```

### 4.4 Fluxo de Posts na Comunidade

```
Usuário clica "Postar na comunidade":
  1. Modal com campo de texto (máx 280 chars)
  2. Escolhe tipo: [Vitória] [Desafio] [Dica]
  3. INSERT community_post
  4. Post aparece no feed de TODOS os public trackers desse tipo
  
Feed filtragem:
  GET /api/community/posts?type=victory&tracker_type={type}
  ORDER BY created_at DESC
  LIMIT 50
  
Reações:
  POST /api/community/posts/{id}/react?emoji=❤️
  INSERT ou UPDATE community_reactions
  
Comentários:
  POST /api/community/posts/{id}/comment
  INSERT community_comments
  
Denúncia:
  POST /api/community/posts/{id}/report
  body: {reason: "harmful", details: "..."}
  INSERT community_reports (status=pending)
  Notifica admin
```

---

## 5. API ENDPOINTS

### Tracker Management
- `POST /api/addiction/trackers` — criar novo tracker
- `GET /api/addiction/trackers` — listar meus trackers
- `GET /api/addiction/trackers/{id}` — detalhe de um tracker
- `PATCH /api/addiction/trackers/{id}` — editar (nome, goal, milestones, etc)
- `DELETE /api/addiction/trackers/{id}` — deletar tracker

### Entries (Notas/Diário)
- `POST /api/addiction/trackers/{id}/entries` — adicionar nota
- `GET /api/addiction/trackers/{id}/entries` — listar notas
- `PATCH /api/addiction/entries/{id}` — editar nota
- `DELETE /api/addiction/entries/{id}` — deletar nota

### Comunidade
- `GET /api/community/ranking?tracker_type={type}` — ranking
- `GET /api/community/feed?type={victory|challenge|tip|all}` — feed de posts
- `POST /api/community/posts` — criar post
- `POST /api/community/posts/{id}/react` — adicionar reação
- `POST /api/community/posts/{id}/comment` — comentar
- `POST /api/community/posts/{id}/report` — denunciar
- `DELETE /api/community/posts/{id}` — deletar próprio post

### Moderação (admin only)
- `GET /api/admin/reports?status=pending` — denúncias pendentes
- `PATCH /api/admin/reports/{id}` — revisar denúncia
- `POST /api/admin/warnings` — emitir aviso

---

## 6. FLUXO WHATSAPP

### Confirmação de Marco

```
Iasmin → WhatsApp:
"🎉 DOU 24 HORAS! 🎉

Parabéns! Você está no dia 1!
Vamos que deu certo, me confirma se continua no compromisso?

[✅ Continuar] [❌ Recaí]"

Callbacks:
POST /api/webhook/evolution
body: {
  event: "messages.upsert",
  data: {
    instance_id: "iasmin",
    sender: {phone: "55..."},
    message: {text: "botão_continuar" ou "botão_recai"}
  }
}

Sistema processa e responde:
"[✅ Continuar] → Próximo marco em 3 dias. Quer adicionar uma nota?
[❌ Recaí] → Tudo bem, a vida é um processo. Quer recomeçar?"
```

---

## 7. SEGURANÇA E PRIVACIDADE

- **Nenhum dado pessoal exposto:** Comunidade mostra apenas nome escolhido + dias
- **Opt-in obrigatório:** Padrão é privado (is_public=false)
- **Moderação manual:** Admin revisa denúncias e nomes inapropriados
- **Sem IA:** Nenhum consumo de tokens, apenas contadores
- **GDPR-ready:** Usuário pode deletar tracker = deleta tudo (cascade)
- **Logs de ações disciplinares:** Todas as deleções/avisos ficam registradas

---

## 8. CASOS DE USO PRINCIPAIS

### UC-1: Novo usuário começando a rastrear
```
João se cadastra → tracker criado como "Barcelona"
João vê cronômetro 00:00:00
Iasmin envia WhatsApp celebrando começo
João customiza nome para "Phoenix"
João habilita is_public para aparecer na comunidade
```

### UC-2: Marco atingido e confirmação
```
Phoenix está no dia 7 (sete dias passaram)
Sistema detecta marco de 7d atingido
Iasmin: "Ahh completamos 7 dias! 💪 Confirma?"
Phoenix: [✅ Continuar]
Phoenix aparece no feed: "Phoenix atingiu 7 dias!"
Comunidade reage com ❤️ 💪 🔥
```

### UC-3: Recaída e retomada
```
Phoenix estava no dia 47
Clica [❌ Recaí]
Sistema: current_streak_days=0, attempt_count=2
No ranking mostra: "❌ Phoenix — 0 dias (Recomeçou há 1h) | Melhor: 47 dias"
Phoenix vê histórico: Melhor streak = 47 dias
Phoenix recomeça imediatamente
```

### UC-4: Interação na comunidade
```
Barcelona vê Phoenix no ranking com 47 dias
Barcelona clica no post "Phoenix atingiu 7 dias"
Barcelona comenta: "Vamos! Você consegue 💪"
Barcelona reage com ❤️
Phoenix vê comentário no app e fica motivado
```

### UC-5: Moderação de conteúdo prejudicial
```
Usuário X posta: "Voltar a usar é ok, ninguém aguenta"
Múltiplos usuários reportam (reason="harmful")
Admin vê denúncia com 12 reports
Admin clica [Deletar]
Post desaparece (mas comentários ficam como "[deletado]")
Usuário X recebe aviso (1º)
```

---

## 9. CONSIDERAÇÕES TÉCNICAS

### Performance
- `custom_milestones` em JSONB para flexibilidade
- Índices em: user_id, is_public, tracker_id, post dates
- Denormalize community_name + streak_days em posts para ranking rápido
- Cache ranking a cada hora (Redis opcional)

### Notificações
- WhatsApp via Evolution API webhook existente (reutilizar)
- Cronômetro como job (cron job ou background task)
- Timezone-aware notifications usando date-fns-tz

### Escalabilidade
- Sem IA = sem custos variáveis
- Apenas queries de contagem/leitura
- Paginação no feed (50 posts por página)

### Integração com Iasmin Existente
- Nova seção no dashboard: "(dashboard)/addiction"
- Novo item no sidebar
- Reutiliza layout, componentes, auth existentes
- Tabelas novas no Supabase (sem alterar schema existente)

---

## 10. ROADMAP / PRÓXIMOS PASSOS

**Fase 1 (MVP):**
- [x] Tracker pessoal com cronômetro
- [x] Marcos com notificações WhatsApp
- [x] Comunidade com ranking
- [x] Posts + reações + comentários
- [x] Moderação básica

**Fase 2 (Futuro):**
- [ ] Achievements/badges (30d, 100d, etc)
- [ ] Sugestões de apoio via IA (opcional, sem consumir tokens principais)
- [ ] Exportar histórico (PDF/CSV)
- [ ] Integração com calendário (Google Calendar)
- [ ] App mobile (PWA)
- [ ] Grupos privados (famílias, amigos)
- [ ] Meditação/resources guiados

---

## 11. VALIDAÇÃO DA SPEC

**Checklist:**
- [x] Sem placeholders ou TODOs
- [x] Modelo de dados completo
- [x] Fluxos explicados
- [x] APIs documentadas
- [x] Casos de uso realistas
- [x] Segurança/privacidade considerada
- [x] Sem consumo de tokens
- [x] Integrável com Iasmin existente

**Ambiguidades resolvidas:**
- [x] Publicidade na comunidade = opt-in
- [x] Nome na comunidade = cidade aleatória + customizável
- [x] Moderação = manual (você revisa)
- [x] Histórico de falhas = salvo (não apagado)
- [x] Múltiplos trackers = permitido

---

**Status:** ✅ Pronto para implementação

**Próximo passo:** Invocar `writing-plans` skill para criar plano detalhado de implementação
