# Iasmin — Assessora Virtual

> **Iasmin, sua assessora virtual.**  
> Assistente pessoal operacional via WhatsApp. Registra despesas, cria lembretes, organiza documentos e muito mais.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 + TypeScript |
| Backend | Next.js API Routes |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth |
| WhatsApp | Evolution API |
| IA | OpenAI API (GPT-4o-mini) |
| Deploy | Vercel |
| Domínio | assessora.gedaias.com |

---

## Configuração — Passo a Passo

### 1. Clone e instale dependências

```bash
cd IASMIN
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais reais.

### 3. Configure o Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. Vá em **SQL Editor** e execute o arquivo `supabase/schema.sql`
3. Copie a **Project URL** e a **Anon Key** para o `.env.local`
4. Copie a **Service Role Key** (Settings → API) para o `.env.local`

### 4. Crie o primeiro usuário (Admin)

1. Rode o projeto: `npm run dev`
2. Acesse `http://localhost:3000/cadastro`
3. Cadastre-se com seu CPF
4. No Supabase SQL Editor, execute:

```sql
UPDATE user_profiles SET role = 'admin' WHERE cpf = 'SEU_CPF_SEM_PONTUACAO';
```

### 5. Configure a Evolution API

1. Instale a Evolution API no seu servidor (ou use uma instância na nuvem)
2. Crie uma instância chamada `iasmin`
3. Configure o webhook para apontar para:
   ```
   https://assessora.gedaias.com/api/webhook/evolution
   ```
4. Habilite os eventos: `messages.upsert`
5. Copie a URL e API Key para o `.env.local`

### 6. Configure a OpenAI

1. Acesse [platform.openai.com](https://platform.openai.com)
2. Crie uma API Key
3. Adicione ao `.env.local`

### 7. Deploy na Vercel

```bash
# Instale a Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Configure as variáveis de ambiente na Vercel em:
**Project → Settings → Environment Variables**

Configure o domínio personalizado:
**Project → Settings → Domains → assessora.gedaias.com**

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/          # Login e cadastro
│   ├── (dashboard)/     # Painel (protegido)
│   │   ├── dashboard/
│   │   ├── aprovacoes/
│   │   ├── whatsapp/
│   │   ├── financeiro/
│   │   ├── lembretes/
│   │   ├── agenda/
│   │   ├── documentos/
│   │   ├── listas/
│   │   ├── desejos/
│   │   ├── viagens/
│   │   ├── integracoes/
│   │   ├── tokens/
│   │   ├── logs/
│   │   └── configuracoes/
│   └── api/
│       ├── webhook/evolution/  # ← Webhook da Evolution API
│       ├── auth/login/
│       ├── auth/register/
│       ├── expenses/
│       ├── reminders/
│       └── approvals/[id]/
├── components/
│   ├── ui/              # Button, Input, Card, Badge, Modal
│   ├── layout/          # Sidebar, Header
│   └── dashboard/       # StatsCard
├── lib/
│   ├── supabase/        # Client e server
│   ├── openai/          # Cliente OpenAI
│   ├── evolution/       # Cliente Evolution API
│   ├── ai/              # Classificador de mensagens
│   └── utils.ts         # Utilitários
└── types/               # Tipos TypeScript
```

---

## Fluxo de uma Mensagem WhatsApp

```
1. Usuário envia: "Iasmin, registra mercado 230 no cartão da Marcela"
2. Evolution API → POST /api/webhook/evolution
3. Sistema verifica se número está autorizado
4. Se não: cria solicitação pendente + notifica usuário
5. Se sim: salva mensagem no banco
6. OpenAI classifica: intent="expense", amount=230, category="mercado"
7. Sistema salva despesa no Supabase
8. Registra uso de tokens
9. Responde no WhatsApp: "Pronto, registrei R$ 230,00 no mercado! ✅"
```

---

## Comandos da Iasmin

```
"Iasmin, registra mercado 230 no cartão da Marcela"
"Iasmin, me lembra de cortar cabelo daqui 20 dias"
"Iasmin, agenda consulta médica dia 25 às 14h"
"Iasmin, guarda essa imagem na pasta Viagem Ubatuba"
"Iasmin, adiciona Air Fryer na minha lista de desejos"
"Iasmin, cria lista de compras: arroz, café e leite"
"Iasmin, fecha a conta da casa"
"Iasmin, quanto gastei esse mês?"
```

---

## Tornar-se Admin

Após criar sua conta, execute no SQL Editor do Supabase:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE cpf = '00000000000'; -- seu CPF sem pontuação
```

---

## Próximos Passos (Pós-MVP)

- [ ] Integrações Google (Calendar, Drive, Docs, Sheets)
- [ ] Workspaces e membros familiares
- [ ] Notificações automáticas de lembretes
- [ ] Exportação para Google Sheets
- [ ] App mobile (PWA)
- [ ] Relatórios financeiros avançados
- [ ] Suporte a voz e áudio

---

*Desenvolvido com ❤️ — assessora.gedaias.com*
