# Deploy da Iasmin na Vercel — Projeto Separado

## ⚠️ IMPORTANTE: A Iasmin é um projeto DIFERENTE do CRM Raiz
Cada projeto na Vercel é independente, com seu próprio domínio e variáveis de ambiente.

---

## Passo 1 — Instalar dependências localmente primeiro

```bash
cd C:\Users\gedai\Documents\Claude\Projects\IASMIN
npm install
```

---

## Passo 2 — Preencher o .env.local

Abra o arquivo `.env.local` na pasta do projeto e preencha:

| Variável | Onde encontrar |
|----------|---------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → seu projeto Iasmin → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role (secret) |
| `OPENAI_API_KEY` | platform.openai.com → API Keys |
| `EVOLUTION_API_KEY` | Evolution API → Settings → API Key |
| `EVOLUTION_INSTANCE_NAME` | `TMT2` (já preenchido) |
| `ADMIN_CPF` | Seu CPF sem pontuação (ex: 12345678900) |

---

## Passo 3 — Executar o schema no Supabase

1. Acesse [supabase.com](https://supabase.com) → seu projeto **exclusivo da Iasmin**
2. Vá em **SQL Editor** → **New query**
3. Copie e cole todo o conteúdo de `supabase/schema.sql`
4. Clique em **Run**

---

## Passo 4 — Testar localmente na porta 3001

```bash
npm run dev
```

Acesse: **http://localhost:3001** (a porta 3000 é do CRM Raiz)

> Se der erro de porta ocupada: `npm run dev -- -p 3002`

---

## Passo 5 — Criar novo projeto na Vercel

### Opção A: Via interface web (recomendado)

1. Acesse [vercel.com](https://vercel.com) → **Add New Project**
2. Clique em **Import Git Repository**
3. Se o projeto não está no GitHub ainda:
   - Crie um repositório novo: `iasmin-assessora`
   - Faça push da pasta IASMIN para ele
4. Selecione o repositório `iasmin-assessora`
5. **Framework Preset**: Next.js (detectado automaticamente)
6. **Root Directory**: deixe vazio (raiz do projeto)
7. **Build Command**: `npm run build`
8. **Output Directory**: `.next`

### Opção B: Via CLI

```bash
cd C:\Users\gedai\Documents\Claude\Projects\IASMIN

# Instala Vercel CLI (se não tiver)
npm i -g vercel

# Faz login (abrirá o browser)
vercel login

# Inicia novo projeto (NÃO vincula ao projeto existente)
vercel --yes
```

---

## Passo 6 — Configurar variáveis de ambiente na Vercel

Na Vercel, vá em:
**Project (Iasmin) → Settings → Environment Variables**

Adicione TODAS as variáveis do `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL         = https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY    = eyJ...
SUPABASE_SERVICE_ROLE_KEY        = eyJ...
OPENAI_API_KEY                   = sk-...
EVOLUTION_API_URL                = https://evolution-evolution-api.k4ezzu.easypanel.host
EVOLUTION_API_KEY                = sua_api_key
EVOLUTION_INSTANCE_NAME          = TMT2
WEBHOOK_SECRET                   = iasmin_webhook_secret_2024
NEXT_PUBLIC_APP_URL              = https://assessora.gedaias.com
NEXT_PUBLIC_APP_NAME             = Iasmin
ADMIN_CPF                        = seu_cpf_sem_pontuacao
```

> Marque todas como **Production + Preview + Development**

---

## Passo 7 — Configurar domínio assessora.gedaias.com

1. Na Vercel → **Project Iasmin → Settings → Domains**
2. Clique em **Add Domain**
3. Digite: `assessora.gedaias.com`
4. A Vercel mostrará os registros DNS para configurar
5. No seu provedor de domínio (onde gedaias.com está registrado):
   - Adicione um registro **CNAME**: `assessora` → `cname.vercel-dns.com`
   - OU um registro **A**: `assessora` → IP fornecido pela Vercel

---

## Passo 8 — Configurar webhook da Evolution API

Na Evolution API (instância TMT2):
- URL: `https://assessora.gedaias.com/api/webhook/evolution`
- Evento: `messages.upsert` ✅ (já configurado conforme screenshot)
- Ativar o toggle **Enabled**

---

## Passo 9 — Criar o usuário admin

Após o deploy e o schema do Supabase estar aplicado:

1. Acesse `https://assessora.gedaias.com/cadastro`
2. Crie sua conta com seu CPF
3. No **Supabase SQL Editor** execute:

```sql
UPDATE user_profiles 
SET role = 'admin' 
WHERE cpf = 'SEU_CPF_SEM_PONTUACAO';
```

4. Acesse `https://assessora.gedaias.com/login` com seu CPF e senha

---

## Resumo dos dois projetos rodando em paralelo

| Projeto | Porta local | URL produção | Vercel |
|---------|------------|--------------|--------|
| CRM Raiz | 3000 | crm.gedaias.com (?) | projeto-crm |
| **Iasmin** | **3001** | **assessora.gedaias.com** | **projeto-iasmin** |

Os dois são completamente independentes — banco de dados separado, Vercel separado, porta separada. ✅
