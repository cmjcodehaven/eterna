# Eterna Photos — Guia de Configuração para Produção

App de fotos para eventos com câmera polaroid, curadoria por casais e download ZIP.

---

## Pré-requisitos

- Node.js 18+ e npm
- Conta no [Supabase](https://supabase.com) (plano gratuito funciona)
- Supabase CLI: `npm install -g supabase`

---

## 1. Criar Projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Anote o **Project URL** e a **anon key** (em Settings → API)
3. Anote também a **service_role key** — ela será usada **apenas nos secrets das Edge Functions**, nunca no frontend

---

## 2. Aplicar a Migration do Banco

```bash
# Faça login na CLI
supabase login

# Vincule ao seu projeto (substitua pelo Project ID da URL do painel)
supabase link --project-ref SEU_PROJECT_ID

# Aplique a migration inicial
supabase db push
```

Se preferir aplicar manualmente: copie o conteúdo de `supabase/migrations/20260101000000_initial_schema.sql` e cole no **SQL Editor** do painel Supabase.

---

## 3. Criar o Bucket de Fotos

No painel Supabase → **Storage → New bucket**:

| Campo       | Valor           |
|-------------|-----------------|
| Nome        | `event-photos`  |
| Público?    | **NÃO** (privado) |

> O bucket **deve ser privado**. Os URLs assinados expiram em 1 hora e são gerados server-side. Nunca habilite acesso público.

---

## 4. Configurar Variáveis de Ambiente

Copie o arquivo de exemplo e preencha:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...   # anon key
VITE_DEFAULT_EVENT_SLUG=casamento-eterna
```

> **Nunca** coloque a `service_role key` no `.env`. Ela pertence apenas aos secrets das Edge Functions.

---

## 5. Fazer Deploy das Edge Functions

```bash
# Fazer deploy de todas as functions de uma vez
supabase functions deploy guest-login
supabase functions deploy submit-photos
supabase functions deploy bootstrap-staff
```

Em seguida, configure os **secrets** no painel (Settings → Edge Functions → Secrets), ou via CLI:

```bash
supabase secrets set BOOTSTRAP_SECRET=uma-senha-longa-e-aleatoria
```

> **Atenção:** `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são **auto-injetados** pelo runtime das Edge Functions — não tente setá-los manualmente (a CLI rejeita vars com prefixo `SUPABASE_`).

> O `BOOTSTRAP_SECRET` protege a criação dos primeiros usuários admin/casal. Use um UUID aleatório ou uma senha forte.

---

## 6. Criar os Usuários de Staff (Admin e Casal)

Após o deploy das Edge Functions, execute **uma única vez**:

```bash
curl -X POST https://SEU_PROJECT_ID.supabase.co/functions/v1/bootstrap-staff \
  -H "Authorization: Bearer SUA_ANON_KEY" \
  -H "x-bootstrap-secret: SUA_BOOTSTRAP_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "adminEmail": "admin@seuemail.com",
    "adminPassword": "senha-forte-admin",
    "coupleEmail": "casal@seuemail.com",
    "couplePassword": "senha-forte-casal"
  }'
```

> O header `Authorization: Bearer <anon-key>` é obrigatório mesmo com `--no-verify-jwt`, pois o gateway do Supabase exige o header presente.

Após criar os usuários, a função pode ser desabilitada no painel Supabase para segurança adicional.

---

## 7. Criar o Primeiro Evento

1. Acesse `/staff` no app e faça login com as credenciais de **admin**
2. Vá para **Painel Admin → Criar Novo Evento**
3. Preencha nome, slug, data e limites de foto
4. O **slug** é o identificador único do evento — use-o no QR Code

---

## 8. Configurar o QR Code dos Convidados

O QR Code deve apontar para:

```
https://seu-app.vercel.app/?evento=SLUG_DO_EVENTO
```

Exemplo: `https://eterna.app/?evento=casamento-marcio-e-ana`

O app detecta o parâmetro `?evento=` e pré-preenche o campo de acesso. Os convidados só precisam digitar o telefone.

> **Dica:** Use [qr.io](https://qr.io) ou [goqr.me](https://goqr.me) para gerar o QR Code com o logo do evento.

---

## 9. Adicionar Convidados

Há duas formas:

**Via Painel dos Noivos** (`/couple` → aba Convidados):
- O casal adiciona nome, telefone, tipo e limite de fotos

**Via Painel Admin** (`/admin/evento/:id`):
- O admin visualiza e edita limites individuais (útil para upgradar VIPs)

---

## 10. Deploy do Frontend

### Vercel (recomendado)

```bash
npm install -g vercel
vercel deploy --prod
```

Configure as variáveis de ambiente no painel Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_DEFAULT_EVENT_SLUG`

### Netlify

```bash
npm run build
# Faça upload da pasta dist/ ou conecte o repositório
```

Adicione as variáveis em **Site settings → Environment variables**.

---

## 11. Checklist de Lançamento

Antes de entregar o app ao cliente, verifique:

- [x] Bucket `event-photos` está com acesso **privado** (não público)
- [x] `SUPABASE_SERVICE_ROLE_KEY` não aparece em nenhum arquivo do frontend (grep confirmado)
- [x] Edge Functions deployadas e secrets configurados (`guest-login`, `submit-photos`, `bootstrap-staff`)
- [x] Migration SQL aplicada e tabelas criadas (`events`, `guests`, `photos`, `user_roles`)
- [x] Usuários admin e casal criados via `bootstrap-staff`
- [x] Evento criado com slug `casamento-eterna`
- [ ] QR Code testado — aponta para a URL certa com `?evento=slug`
- [ ] Login de convidado testado (telefone + slug do evento)
- [ ] Câmera funcionando em iPhone Safari e Android Chrome
- [ ] Upload de fotos testado (aparece na galeria dos noivos)
- [ ] Curadoria e download ZIP testados

---

## Segurança — Resumo dos Princípios

| Regra | Por quê |
|-------|---------|
| Bucket privado | Fotos de casamento são dados pessoais sensíveis |
| service_role apenas no server | Nunca expor no frontend — dá acesso irrestrito ao banco |
| Triple-check no submit-photos | Impede que um convidado envie fotos em nome de outro |
| clearPendingPhotos só após data.ok | Garante que nenhuma foto seja perdida em caso de falha de rede |
| Guests sem Supabase Auth | Simplifica o acesso — basta o telefone, sem cadastro |

---

## Estrutura de Pastas

```
src/
├── contexts/        GuestContext, StaffContext
├── components/      BrandHeader, ProtectedStaffRoute, PolaroidFrame,
│                    OfflineBanner
├── hooks/           useOnlineStatus
├── pages/           Login, Home, Camera, Review, StaffLogin,
│                    CoupleDashboard, Curatorship,
│                    AdminDashboard, AdminEventDetail
├── lib/             phone, image, photoStorage, supabasePhotos,
│                    supabaseAdmin, downloadZip
├── types/           domain.ts
└── integrations/    supabase/client.ts, supabase/types.ts

supabase/
├── functions/       guest-login, submit-photos, bootstrap-staff
└── migrations/      20260101000000_initial_schema.sql
```
