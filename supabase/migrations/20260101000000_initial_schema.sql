-- ============================================================
-- Eterna Photos — Schema inicial
-- Aplicar com: supabase db push
-- ============================================================

-- ── 1. Enums ─────────────────────────────────────────────────

create type public.app_role   as enum ('admin', 'couple');
create type public.guest_type as enum ('guest', 'sponsor');

-- ── 2. Tabelas ────────────────────────────────────────────────

-- Eventos (arquitetura multi-evento desde o início)
create table public.events (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  event_date                  date,
  slug                        text not null unique,
  default_guest_photo_limit   int  not null default 10,
  default_sponsor_photo_limit int  not null default 20,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now()
);
create index events_slug_idx on public.events(slug);

-- Convidados — identificados por telefone, não por CPF
create table public.guests (
  id           uuid primary key default gen_random_uuid(),
  event_id     uuid not null references public.events(id) on delete cascade,
  name         text not null,
  phone_digits text not null,
  guest_type   public.guest_type not null default 'guest',
  photo_limit  int  not null default 10,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (event_id, phone_digits),
  constraint guests_phone_digits_format check (phone_digits ~ '^[0-9]{10,15}$'),
  constraint guests_photo_limit_positive check (photo_limit > 0)
);
create index guests_event_id_idx    on public.guests(event_id);
create index guests_phone_digits_idx on public.guests(phone_digits);

-- Fotos enviadas pelos convidados
create table public.photos (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id)  on delete cascade,
  guest_id           uuid not null references public.guests(id)   on delete cascade,
  guest_name         text not null,
  guest_phone_digits text not null,
  storage_path       text not null,
  selected           boolean     not null default false,
  selected_at        timestamptz,
  selected_by        uuid references auth.users(id),
  created_at         timestamptz not null default now()
);
create index photos_event_id_idx  on public.photos(event_id);
create index photos_guest_id_idx  on public.photos(guest_id);
create index photos_created_at_idx on public.photos(created_at desc);
create index photos_selected_idx  on public.photos(selected);

-- Perfis de usuários autenticados (staff)
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Roles de staff
create table public.user_roles (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- ── 3. Funções auxiliares ────────────────────────────────────

-- Verifica se um usuário possui determinada role
create or replace function public.has_role(
  _user_id uuid,
  _role    public.app_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from   public.user_roles
    where  user_id = _user_id
      and  role    = _role
  )
$$;

-- Atualiza updated_at automaticamente
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

-- ── 4. Triggers ──────────────────────────────────────────────

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

create trigger guests_updated_at
  before update on public.guests
  for each row execute function public.set_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── 5. Row Level Security ─────────────────────────────────────

-- events
alter table public.events enable row level security;

create policy "Staff pode ver eventos"
  on public.events for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'couple')
  );

create policy "Admin gerencia eventos"
  on public.events for all
  to authenticated
  using      (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- guests
alter table public.guests enable row level security;

create policy "Staff pode ver convidados"
  on public.guests for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'couple')
  );

create policy "Staff pode inserir convidados"
  on public.guests for insert
  to authenticated
  with check (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'couple')
  );

create policy "Admin atualiza convidados"
  on public.guests for update
  to authenticated
  using      (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admin remove convidados"
  on public.guests for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- photos
alter table public.photos enable row level security;

create policy "Staff pode ver fotos"
  on public.photos for select
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'couple')
  );

create policy "Staff pode marcar fotos como selecionadas"
  on public.photos for update
  to authenticated
  using (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'couple')
  )
  with check (
    public.has_role(auth.uid(), 'admin') or
    public.has_role(auth.uid(), 'couple')
  );

create policy "Admin remove fotos"
  on public.photos for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- profiles
alter table public.profiles enable row level security;

create policy "Usuário vê próprio perfil"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Usuário atualiza próprio perfil"
  on public.profiles for update
  to authenticated
  using      (id = auth.uid())
  with check (id = auth.uid());

-- user_roles
alter table public.user_roles enable row level security;

create policy "Usuário vê própria role"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Admin gerencia roles"
  on public.user_roles for all
  to authenticated
  using      (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- ── 6. Storage ────────────────────────────────────────────────

-- Bucket PRIVADO — convidados não acessam diretamente
insert into storage.buckets (id, name, public)
values ('event-photos', 'event-photos', false)
on conflict (id) do nothing;

-- Noivos e admin leem fotos via URLs assinadas
create policy "Staff pode ler fotos do evento"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'event-photos'
    and (
      public.has_role(auth.uid(), 'admin') or
      public.has_role(auth.uid(), 'couple')
    )
  );

-- Admin gerencia todos os objetos do bucket
create policy "Admin gerencia fotos do storage"
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

-- ── 7. Seed — Evento inicial ──────────────────────────────────
-- Ajuste name, slug e event_date conforme necessário.
-- O slug deve coincidir com VITE_DEFAULT_EVENT_SLUG no .env.

insert into public.events (
  name,
  slug,
  event_date,
  default_guest_photo_limit,
  default_sponsor_photo_limit
) values (
  'Casamento Eterna',
  'casamento-eterna',
  null,
  10,
  20
)
on conflict (slug) do nothing;
