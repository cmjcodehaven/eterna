# DATABASE_AND_SUPABASE.md — Eterna Photos

> Especificação de banco, Supabase Storage, Edge Functions, RLS e migração obrigatória de CPF para telefone.

---

## 1. Decisão principal

A versão final do Eterna Photos deve usar **telefone** como identificador de acesso do convidado.

O protótipo atual usa CPF nos seguintes pontos:

```txt
guests.cpf
photos.guest_cpf
GuestRecord.cpf
guest.cpf
formatCPF
isValidCPFFormat
guess-login
submit-photos com campo cpf
```

Esses nomes devem ser substituídos por telefone.

---

## 2. Estratégia recomendada de telefone

### Campos

Usar `phone_digits` como valor normalizado principal.

```txt
phone_digits = somente números
```

Exemplos:

```txt
(35) 99999-9999 -> 35999999999
35 3333-3333    -> 3533333333
+55 35 99999... -> preferir normalizar para 5535999999999 se for adotado E.164
```

### Recomendação para primeira versão brasileira

Aceitar 10 ou 11 dígitos nacionais:

```txt
10 dígitos: DDD + fixo
11 dígitos: DDD + celular
```

No futuro, pode evoluir para E.164 completo.

---

## 3. Schema recomendado

## 3.1 Enums

```sql
create type public.app_role as enum ('admin', 'couple');
create type public.guest_type as enum ('guest', 'sponsor');
```

---

## 3.2 Tabela `events`

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  slug text not null unique,
  default_guest_photo_limit int not null default 10,
  default_sponsor_photo_limit int not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_slug_idx on public.events(slug);
```

### Motivo

Mesmo que a primeira versão use apenas um casamento, o app deve nascer preparado para vários eventos.

---

## 3.3 Tabela `guests`

```sql
create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  phone_digits text not null,
  guest_type public.guest_type not null default 'guest',
  photo_limit int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint guests_phone_digits_format check (phone_digits ~ '^[0-9]{10,15}$'),
  constraint guests_photo_limit_positive check (photo_limit > 0),
  unique (event_id, phone_digits)
);

create index guests_event_id_idx on public.guests(event_id);
create index guests_phone_digits_idx on public.guests(phone_digits);
```

### Campos removidos/substituídos

```txt
cpf -> phone_digits
```

---

## 3.4 Tabela `photos`

```sql
create table public.photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_id uuid not null references public.guests(id) on delete cascade,
  guest_name text not null,
  guest_phone_digits text not null,
  storage_path text not null,
  selected boolean not null default false,
  selected_at timestamptz,
  selected_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index photos_event_id_idx on public.photos(event_id);
create index photos_guest_id_idx on public.photos(guest_id);
create index photos_created_at_idx on public.photos(created_at desc);
create index photos_selected_idx on public.photos(selected);
```

### Motivo do campo denormalizado `guest_phone_digits`

Mesmo com `guest_id`, manter `guest_phone_digits` e `guest_name` ajuda em exportações, histórico e leitura rápida. O vínculo real continua sendo `guest_id`.

---

## 3.5 Tabela `profiles`

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

---

## 3.6 Tabela `user_roles`

```sql
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
```

---

## 4. Funções SQL auxiliares

## 4.1 `has_role`

```sql
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;
```

---

## 4.2 `set_updated_at`

```sql
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

Aplicar em:

```txt
events
guests
profiles
```

---

## 5. RLS recomendado

## 5.1 `events`

- Noivos/admin autenticados podem ler eventos associados.
- Admin pode criar/atualizar/remover.
- Para primeira versão, se houver apenas um evento, noivos/admin podem ler todos.

Exemplo simples para MVP:

```sql
alter table public.events enable row level security;

create policy "Staff can view events"
on public.events for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'couple')
);

create policy "Admins can manage events"
on public.events for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));
```

---

## 5.2 `guests`

```sql
alter table public.guests enable row level security;

create policy "Couple and admin can view guests"
on public.guests for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'couple')
);

create policy "Couple and admin can insert guests"
on public.guests for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'couple')
);

create policy "Admins can update guests"
on public.guests for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete guests"
on public.guests for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));
```

Observação: se os noivos precisarem editar/remover convidados, criar políticas específicas.

---

## 5.3 `photos`

```sql
alter table public.photos enable row level security;

create policy "Couple and admin can view photos"
on public.photos for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'couple')
);

create policy "Couple and admin can update photo selection"
on public.photos for update
to authenticated
using (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'couple')
)
with check (
  public.has_role(auth.uid(), 'admin')
  or public.has_role(auth.uid(), 'couple')
);

create policy "Admins can delete photos"
on public.photos for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));
```

Convidados não precisam de acesso direto à tabela `photos`; upload deve passar por Edge Function.

---

## 6. Storage

## 6.1 Bucket

```sql
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', false)
on conflict (id) do nothing;
```

## 6.2 Políticas

```sql
create policy "Couple and admin can read event photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'event-photos'
  and (
    public.has_role(auth.uid(), 'admin')
    or public.has_role(auth.uid(), 'couple')
  )
);

create policy "Admins can manage event photos"
on storage.objects for all
to authenticated
using (
  bucket_id = 'event-photos'
  and public.has_role(auth.uid(), 'admin')
)
with check (
  bucket_id = 'event-photos'
  and public.has_role(auth.uid(), 'admin')
);
```

Uploads de convidados devem ocorrer via Edge Function usando service role.

---

## 7. Edge Function: `guest-login`

## 7.1 Objetivo

Validar acesso do convidado por telefone.

## 7.2 Entrada

```json
{
  "eventSlug": "casamento-eterna",
  "phone": "(35) 99999-9999"
}
```

## 7.3 Saída de sucesso

```json
{
  "guest": {
    "id": "uuid",
    "eventId": "uuid",
    "name": "Ana Beatriz Almeida",
    "phoneDigits": "35999999999",
    "guestType": "guest",
    "photoLimit": 10
  },
  "uploadedCount": 7
}
```

## 7.4 Regras

- Normalizar telefone.
- Validar 10 a 15 dígitos.
- Buscar evento por slug.
- Buscar convidado por `event_id + phone_digits`.
- Contar fotos já enviadas por `guest_id`.
- Não retornar dados de outros convidados.

## 7.5 Erros

```txt
Telefone inválido
Evento não encontrado
Convidado não encontrado
```

---

## 8. Edge Function: `submit-photos`

## 8.1 Entrada

Multipart form data:

```txt
eventId
guestId
phone
files[]
```

## 8.2 Processo

1. Normalizar telefone.
2. Buscar convidado por `event_id + guest_id + phone_digits`.
3. Contar fotos já enviadas.
4. Validar limite:

```txt
already + files.length <= photo_limit
```

5. Salvar arquivos no Storage.
6. Inserir registros em `photos`.
7. Retornar sucesso.

## 8.3 Caminho de storage

```txt
events/{eventId}/guests/{guestId}/{timestamp}-{uuid}.jpg
```

## 8.4 Saída de sucesso

```json
{
  "ok": true,
  "uploaded": 2
}
```

## 8.5 Erros

```txt
Telefone inválido
Convidado não encontrado
Nenhuma foto enviada
Limite de fotos excedido
Falha no upload
Falha ao registrar foto
```

---

## 9. Migração de código: CPF para telefone

## 9.1 Renomear tipos

Antes:

```ts
interface GuestRecord {
  cpf: string;
  name: string;
  guestType: GuestType;
  photoLimit: number;
}
```

Depois:

```ts
interface GuestRecord {
  id: string;
  eventId: string;
  phoneDigits: string;
  name: string;
  guestType: GuestType;
  photoLimit: number;
}
```

---

## 9.2 Criar `src/lib/phone.ts`

```ts
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function normalizePhoneBR(value: string): string {
  return onlyDigits(value);
}

export function isValidPhoneBR(value: string): boolean {
  const digits = normalizePhoneBR(value);
  return digits.length === 10 || digits.length === 11;
}

export function formatPhoneBR(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}
```

---

## 9.3 Login do convidado

Antes:

```ts
const [cpf, setCpf] = useState("");
const found = await login(cpf);
```

Depois:

```ts
const [phone, setPhone] = useState("");
const found = await login(phone);
```

---

## 9.4 Envio de fotos

Antes:

```ts
form.append("cpf", guest.cpf);
```

Depois:

```ts
form.append("eventId", guest.eventId);
form.append("guestId", guest.id);
form.append("phone", guest.phoneDigits);
```

---

## 9.5 Armazenamento local

Antes:

```ts
listPhotosByGuest(guest.cpf)
```

Depois:

```ts
listPhotosByGuest(guest.eventId, guest.id)
```

---

## 10. Variáveis de ambiente

Frontend:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_DEFAULT_EVENT_SLUG=casamento-eterna
```

Edge Functions:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
BOOTSTRAP_SECRET=
```

Nunca expor `SUPABASE_SERVICE_ROLE_KEY` no frontend.

---

## 11. Checklist de validação Supabase

- [ ] Tabelas criadas.
- [ ] RLS ativado.
- [ ] Policies aplicadas.
- [ ] Bucket privado criado.
- [ ] Edge Function `guest-login` publicada.
- [ ] Edge Function `submit-photos` publicada.
- [ ] Função de login por telefone funcionando.
- [ ] Upload por convidado funcionando sem expor service role.
- [ ] URLs assinadas funcionando para noivos/admin.
- [ ] Download `.zip` funcionando.
- [ ] Nenhum campo CPF usado na versão final.
