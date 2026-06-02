# CONTEXT.md — Eterna Photos


> Este arquivo deve ser lido antes de qualquer implementação. Ele define produto, telas obrigatórias, regras de negócio, stack, arquitetura, padrões visuais e mudanças necessárias em relação ao protótipo atual.

---

## 1. Resumo do produto

**Nome:** Eterna Photos  
**Tipo:** Aplicação web para eventos, com foco inicial em casamentos.  
**Proposta:** Transformar convidados em “fotógrafos do evento”, permitindo que eles registrem e enviem fotos pelo celular através de um link/QR Code, com experiência visual premium, elegante e simples.

O sistema tem duas experiências principais:

1. **Experiência do convidado**
   - O convidado acessa o app por link ou QR Code.
   - Informa seu **número de telefone** previamente cadastrado.
   - Vê seu limite de fotos.
   - Abre a câmera.
   - Tira fotos com moldura/estética polaroid.
   - Revisa fotos pendentes salvas localmente.
   - Confirma o envio para o álbum dos noivos.

2. **Experiência dos noivos/administração**
   - Noivos acessam uma área privada.
   - Visualizam todas as fotos enviadas.
   - Identificam o convidado que enviou cada foto.
   - Selecionam fotos favoritas.
   - Usam curadoria estilo “Tinder”: pular, voltar, escolher.
   - Baixam fotos selecionadas em `.zip`.
   - Gerenciam convidados e limites de fotos.
   - Admin possui permissões totais, incluindo configurações e remoções mais sensíveis.

---

## 2. Mudança obrigatória em relação ao protótipo atual

O protótipo atual usa **CPF** como identificador do convidado em várias partes do código, banco e Edge Functions.

A versão final **não deve usar CPF para acesso dos convidados**.

### Novo padrão obrigatório

O acesso dos convidados será feito por **número de telefone**.

Substituir todos os usos funcionais de CPF por telefone:

| No protótipo atual | Na versão final |
|---|---|
| `cpf` | `phone` ou `phone_digits` |
| `guest_cpf` | `guest_phone` |
| `formatCPF` | `formatPhoneBR` |
| `isValidCPFFormat` | `isValidPhoneBR` |
| `guess-login` validando CPF | função de login validando telefone |
| input “CPF” | input “Telefone” |
| placeholder `000.000.000-00` | placeholder `(00) 00000-0000` |
| texto “Informe seu CPF” | “Informe seu telefone cadastrado” |

### Regra de normalização de telefone

- O usuário pode digitar telefone com ou sem máscara.
- O sistema deve remover caracteres não numéricos antes de validar.
- Para Brasil, aceitar preferencialmente:
  - 10 dígitos: telefone fixo com DDD.
  - 11 dígitos: celular com DDD.
- Armazenar no banco em formato normalizado, preferencialmente `phone_digits`, somente números.
- Exibir com máscara brasileira no frontend: `(35) 99999-9999` ou `(35) 3333-3333`.
- Não permitir dois convidados com o mesmo telefone dentro do mesmo evento.

---

## 3. Stack atual identificada no protótipo

O protótipo baixado da Lovable indica a seguinte base técnica:

- React 18
- TypeScript
- Vite
- React Router DOM
- TailwindCSS
- shadcn/ui / Radix UI
- lucide-react
- Supabase JS
- Supabase Database
- Supabase Storage
- Supabase Edge Functions
- localforage para armazenamento local/offline das fotos pendentes
- JSZip para download em lote
- sonner e toaster para feedbacks

### Recomendação para a versão final

Manter a stack abaixo, a não ser que o projeto seja migrado de forma consciente:

- **Frontend:** React + TypeScript + Vite
- **UI:** TailwindCSS + shadcn/ui + Radix UI
- **Rotas:** React Router
- **Backend:** Supabase Database + Supabase Storage + Supabase Edge Functions
- **Auth de staff:** Supabase Auth para noivos/admin
- **Acesso de convidado:** validação por telefone cadastrado, via Edge Function
- **Storage offline:** IndexedDB/localforage para fotos pendentes antes da confirmação de envio
- **Deploy:** Vercel/Netlify para o frontend + Supabase para backend

---

## 4. Estrutura atual de rotas do protótipo

Rotas identificadas no `app.tsx`:

```txt
/              -> Login do convidado ou redirecionamento para /app se já houver sessão local
/app           -> Dashboard do convidado
/app/camera    -> Câmera com efeito polaroid
/app/review    -> Fotos pendentes antes do envio
/staff         -> Login dos noivos/admin
/couple        -> Painel dos noivos
/admin         -> Painel administrativo
*              -> NotFound
```

Essas rotas devem ser mantidas na reconstrução, com ajustes internos para telefone em vez de CPF.

---

## 5. Perfis de usuário

## 5.1 Convidado

Usuário do evento que acessa por QR Code/link público.

### Acesso

- Não usa senha.
- Não usa CPF.
- Entra informando o **telefone cadastrado**.
- O telefone deve existir na lista de convidados do evento.

### Pode

- Acessar a área do convidado.
- Ver seu nome.
- Ver quantas fotos já enviou.
- Ver quantas fotos ainda pode enviar.
- Abrir câmera.
- Tirar fotos com moldura polaroid.
- Revisar fotos pendentes salvas no dispositivo.
- Apagar fotos pendentes antes de confirmar.
- Confirmar envio.

### Não pode

- Acessar fotos de outros convidados.
- Ver galeria dos noivos.
- Escolher ou baixar fotos.
- Alterar limite de fotos.
- Enviar mais fotos do que o limite permitido.
- Entrar se o telefone não estiver cadastrado.

---

## 5.2 Noivos / Donos do evento

Usuários autenticados da área privada.

### Pode

- Acessar painel dos noivos.
- Ver todas as fotos enviadas.
- Ver fotos agrupadas por convidado.
- Saber nome e telefone de quem enviou cada foto.
- Marcar fotos como selecionadas.
- Fazer curadoria estilo escolha/pular/voltar.
- Baixar fotos selecionadas em `.zip`.
- Baixar uma seleção manual rápida em `.zip`.
- Adicionar convidados.
- Definir tipo do convidado, com limite correspondente.

### Não deve poder, salvo se decidido explicitamente

- Apagar todas as fotos do evento.
- Alterar configurações globais sensíveis.
- Gerenciar contas de admin.

---

## 5.3 Admin

Usuário administrativo com controle total.

### Pode

- Executar todas as ações dos noivos.
- Ver estatísticas gerais.
- Gerenciar convidados.
- Remover convidados.
- Apagar fotos individuais.
- Limpar todas as fotos, com confirmação explícita.
- Editar configurações do evento.
- Gerenciar integrações futuras.

---

## 6. Tipos de convidado e limites de fotos

O protótipo possui dois tipos de convidado:

```txt
guest   -> Convidado comum
sponsor -> Padrinho/Madrinha
```

### Limites esperados

- Convidado comum: até 10 fotos.
- Padrinho/Madrinha: até 20 fotos.

Esses limites devem continuar existindo, mas a arquitetura deve permitir personalização por convidado.

### Regra final recomendada

A tabela `guests` deve possuir:

```txt
guest_type
photo_limit
```

O `guest_type` define o padrão inicial, mas `photo_limit` é o valor real usado na validação.

Exemplo:

- `guest_type = guest`, `photo_limit = 10`
- `guest_type = sponsor`, `photo_limit = 20`
- Futuramente pode existir convidado VIP com limite personalizado.

---

## 7. Telas obrigatórias

As telas abaixo são obrigatórias e devem seguir os prints existentes na pasta `screenshots/`.

### Convenção recomendada de nomes dos prints

```txt
screenshots/
  01-dashboard-convidado.png
  02-login-staff.png
  03-review-fotos-pendentes.png
  04-camera-polaroid.png
  05-album-noivos-fechado.png
  06-album-noivos-galeria-expandida.png
  07-curadoria.png
  08-convidados.png
```

---

## 7.1 Login do convidado

### Rota

```txt
/
```

### Objetivo

Permitir que o convidado acesse sua área informando o telefone cadastrado.

### Elementos obrigatórios

- Cabeçalho com marca “Eterna Photos”.
- Subtítulo relacionado ao evento, por exemplo “Fotógrafos do Evento”.
- Texto curto explicando o acesso.
- Campo de telefone.
- Botão “Entrar”.
- Link discreto para área dos noivos/admin.

### Conteúdo textual recomendado

```txt
Para começar a registrar momentos,
informe seu telefone cadastrado.
```

Campo:

```txt
TELEFONE
(00) 00000-0000
```

Erro quando telefone não existe:

```txt
Convidado não encontrado.
Verifique o telefone ou fale com a recepção.
```

### Regras

- Não aceitar CPF.
- Normalizar telefone antes da validação.
- Bloquear botão enquanto telefone for inválido.
- Ao login com sucesso, salvar sessão local do convidado.
- Redirecionar para `/app`.
- Se já houver convidado logado localmente, `/` redireciona para `/app`.

---

## 7.2 Dashboard do convidado

### Rota

```txt
/app
```

### Referência visual

```txt
screenshots/01-dashboard-convidado.png
```

### Objetivo

Mostrar status do convidado e ações principais.

### Elementos obrigatórios

- Cabeçalho “Eterna Photos”.
- Saudação “Bem-vindo(a)”.
- Nome do convidado.
- Card “Seu registro”.
- Contador de fotos enviadas: `enviadas / limite`.
- Mensagem: “Você já enviou X de Y fotos”.
- Indicação de fotos pendentes no dispositivo.
- Indicação de fotos restantes.
- Botão “Abrir câmera”.
- Botão “Fotos pendentes (N)”.
- Botão discreto “Sair”.

### Regras

- `enviadas` vem do banco.
- `pendentes` vem do armazenamento local do dispositivo.
- `restantes = photo_limit - enviadas - pendentes`.
- Se `restantes <= 0`, bloquear “Abrir câmera”.
- Se `pendentes = 0`, bloquear “Fotos pendentes”.
- Deve atualizar contagem ao voltar da câmera ou revisão.

---

## 7.3 Câmera com polaroid

### Rota

```txt
/app/camera
```

### Referência visual

```txt
screenshots/04-camera-polaroid.png
```

### Objetivo

Permitir captura de foto pelo celular e aplicar moldura/estética polaroid antes de guardar localmente.

### Elementos obrigatórios

- Indicador superior: `usadas / limite`.
- Área grande da câmera/preview.
- Botão “Polaroid ON”.
- Botão circular de captura.
- Texto inferior: `RESTAM X FOTO(S)`.

### Regras

- Usar `navigator.mediaDevices.getUserMedia`.
- Priorizar câmera traseira em mobile quando possível.
- Se a câmera falhar, exibir mensagem clara.
- Aplicar renderização em canvas para gerar imagem final estilo polaroid.
- O polaroid deve conter:
  - Foto recortada em formato quadrado.
  - Moldura clara/off-white.
  - Base inferior maior.
  - Nome do convidado escrito na base.
  - Estética levemente vintage.
- A foto capturada não deve ir direto para o servidor.
- A foto deve ser salva primeiro no dispositivo como pendente.
- Depois de capturar, redirecionar ou permitir ir para revisão.
- Nunca permitir ultrapassar o limite considerando fotos já enviadas + pendentes.

---

## 7.4 Fotos pendentes / revisão

### Rota

```txt
/app/review
```

### Referência visual

```txt
screenshots/03-review-fotos-pendentes.png
```

### Objetivo

Permitir que o convidado revise, apague e confirme o envio das fotos que ainda estão salvas no dispositivo.

### Elementos obrigatórios

- Botão “Voltar”.
- Indicador `usadas / limite`.
- Cabeçalho “Eterna Photos”.
- Subtítulo “Suas Fotos”.
- Grid com fotos pendentes.
- Ícone para apagar cada foto.
- Botão “Confirmar envio (N)”.
- Botão “Tirar mais fotos”.
- Texto informativo:

```txt
Suas fotos ficam salvas neste dispositivo. Mesmo sem internet, nada se perde.
O envio só acontece ao confirmar.
```

### Regras

- Fotos pendentes são armazenadas localmente em IndexedDB/localforage.
- Cada foto pertence ao telefone/convidado logado.
- O usuário pode apagar fotos pendentes antes do envio.
- Ao confirmar envio:
  - Enviar todas as fotos pendentes via Edge Function.
  - Validar novamente limite no backend.
  - Salvar arquivos no Supabase Storage.
  - Criar registros em `photos`.
  - Limpar fotos locais somente após sucesso.
  - Atualizar contador de fotos enviadas.
- Em caso de falha de internet/servidor:
  - Não apagar fotos locais.
  - Exibir erro claro.

---

## 7.5 Login dos noivos/admin

### Rota

```txt
/staff
```

### Referência visual

```txt
screenshots/02-login-staff.png
```

### Objetivo

Permitir acesso restrito aos noivos e admin.

### Elementos obrigatórios

- Cabeçalho “Eterna Photos”.
- Subtítulo “Acesso Restrito”.
- Texto “Área dos noivos e administração.”
- Campo usuário/e-mail.
- Campo senha.
- Botão “Entrar”.
- Rodapé discreto “ETERNA — ÁREA PRIVADA”.

### Regras

- Preferir Supabase Auth real.
- Não manter credenciais fixas em código na versão final.
- Redirecionar conforme role:
  - `couple` -> `/couple`
  - `admin` -> `/admin`
- Exibir erro para credenciais inválidas.

---

## 7.6 Álbum dos noivos — Galeria

### Rota

```txt
/couple
```

### Aba

```txt
GALERIA
```

### Referências visuais

```txt
screenshots/05-album-noivos-fechado.png
screenshots/06-album-noivos-galeria-expandida.png
```

### Objetivo

Permitir que os noivos visualizem fotos agrupadas por convidado, marquem selecionadas e baixem seleções.

### Elementos obrigatórios

- Cabeçalho “Eterna Photos”.
- Subtítulo “Álbum dos Noivos”.
- Contador geral: `N FOTOS · X SELECIONADA(S)`.
- Abas:
  - Galeria
  - Curadoria
  - Convidados
- Lista de convidados com:
  - Nome
  - Quantidade de fotos
  - Quantidade selecionada
  - Expansão/colapso
- Ao expandir:
  - Grid de fotos.
  - Estrela para marcar/desmarcar foto como selecionada.
  - Seleção manual rápida por convidado.
- Botão “Baixar selecionadas dos noivos (N)”.
- Botão “Baixar escolha rápida (N)” quando houver seleção manual temporária.

### Regras

- Fotos devem ser carregadas do Supabase Storage usando URLs assinadas.
- Fotos devem ser agrupadas por `guest_id` ou telefone/nome.
- Marcar foto como selecionada deve persistir no banco.
- Seleção manual rápida não precisa persistir; serve apenas para download temporário.
- Download deve gerar `.zip` com pastas por convidado.
- Nome dos arquivos deve considerar data/hora da foto.

---

## 7.7 Álbum dos noivos — Curadoria

### Rota

```txt
/couple
```

### Aba

```txt
CURADORIA
```

### Referência visual

```txt
screenshots/07-curadoria.png
```

### Objetivo

Permitir escolha rápida de fotos no estilo “pular / voltar / escolher”.

### Elementos obrigatórios

- Contador: `foto atual / total`.
- Card grande com foto em moldura polaroid.
- Nome do convidado.
- Data e hora.
- Três ações circulares:
  - Pular
  - Voltar
  - Escolher
- Estado final “Curadoria concluída”.
- Botão para baixar selecionadas.
- Botão para revisar novamente.

### Regras

- “Escolher” marca `selected = true` no banco.
- “Pular” deve avançar e, se a foto estiver selecionada, pode desmarcar conforme comportamento atual do protótipo.
- “Voltar” retorna para a foto anterior.
- A ação de voltar não precisa desfazer automaticamente a seleção, mas deve permitir redecidir.
- O estado selecionado deve permanecer consistente com a galeria.

---

## 7.8 Álbum dos noivos — Convidados

### Rota

```txt
/couple
```

### Aba

```txt
CONVIDADOS
```

### Referência visual

```txt
screenshots/08-convidados.png
```

### Objetivo

Permitir que os noivos adicionem e consultem convidados.

### Elementos obrigatórios

- Formulário “Adicionar convidado”.
- Campo nome completo.
- Campo telefone.
- Seleção de tipo:
  - Convidado — até 10 fotos.
  - Padrinho/Madrinha — até 20 fotos.
- Botão “Adicionar”.
- Lista “Convidados (N)”.
- Para cada convidado:
  - Nome.
  - Tipo.
  - Telefone formatado.
  - Limite de fotos.

### Regras

- Não usar CPF.
- Validar telefone.
- Não permitir telefone duplicado no mesmo evento.
- Ao escolher tipo, aplicar limite padrão correspondente.
- Arquitetura deve permitir edição futura de limite individual.

---

## 7.9 Painel Admin

### Rota

```txt
/admin
```

### Objetivo

Área de controle total do sistema.

### Abas identificadas no protótipo

- Overview / Fotos
- Convidados
- Configurações
- Integrações

### Funcionalidades obrigatórias

- Ver total de fotos.
- Ver convidados ativos.
- Ver total de convidados.
- Ver fotos enviadas.
- Apagar foto individual.
- Limpar todas as fotos com confirmação.
- Adicionar/remover convidados.
- Configurar nome e data do evento.
- Mostrar seção de integrações futuras.

### Regras

- Apenas role `admin` acessa `/admin`.
- Todas as ações destrutivas exigem confirmação.
- Não usar credenciais hardcoded em produção.

---

## 8. Banco de dados recomendado

A versão atual do protótipo usa `guests.cpf` e `photos.guest_cpf`. A versão final deve migrar para telefone.

### 8.1 Tabela `events`

Mesmo que a primeira versão tenha apenas um evento, a arquitetura deve estar preparada para múltiplos eventos.

```sql
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date,
  slug text unique,
  default_guest_photo_limit int not null default 10,
  default_sponsor_photo_limit int not null default 20,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 8.2 Tabela `guests`

```sql
create type public.guest_type as enum ('guest', 'sponsor');

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  phone_digits text not null,
  guest_type public.guest_type not null default 'guest',
  photo_limit int not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, phone_digits),
  constraint phone_digits_format check (phone_digits ~ '^[0-9]{10,15}$'),
  constraint photo_limit_positive check (photo_limit > 0)
);
```

### 8.3 Tabela `photos`

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
```

### 8.4 Tabelas de staff

Manter:

```txt
profiles
user_roles
```

Roles:

```txt
admin
couple
```

### 8.5 Storage

Bucket:

```txt
event-photos
```

Regras:

- Bucket privado.
- Noivos/admin acessam via URLs assinadas.
- Upload de convidados deve passar por Edge Function com service role.
- Convidado não deve ter acesso direto ao bucket.

### 8.6 Caminho recomendado das fotos no Storage

```txt
events/{event_id}/guests/{guest_id}/{timestamp}-{uuid}.jpg
```

Evitar usar telefone diretamente no caminho do arquivo para reduzir exposição de dados pessoais.

---

## 9. Edge Functions necessárias

## 9.1 `guest-login`

Substitui a função atual `guess-login` baseada em CPF.

### Entrada

```json
{
  "eventSlug": "casamento-eterna",
  "phone": "(35) 99999-9999"
}
```

### Processo

1. Normalizar telefone para dígitos.
2. Buscar evento pelo `eventSlug`.
3. Buscar convidado por `event_id + phone_digits`.
4. Contar fotos já enviadas por `guest_id`.
5. Retornar dados do convidado e contador.

### Saída de sucesso

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

---

## 9.2 `submit-photos`

### Entrada

Multipart form data:

```txt
eventId
guestId
phone
files[]
```

### Processo

1. Validar convidado pelo `guestId + phone_digits + event_id`.
2. Contar fotos já enviadas.
3. Validar `already + files.length <= photo_limit`.
4. Subir arquivos para o Storage.
5. Inserir registros em `photos`.
6. Retornar quantidade enviada.

### Regra crítica

A validação de limite deve acontecer no backend, mesmo que o frontend já tenha validado.

---

## 9.3 `bootstrap-staff`

O protótipo possui uma função para criar contas fixas de noivos/admin.

Na versão final:

- Não deixar senhas fixas no repositório.
- Usar variáveis de ambiente, seed manual seguro ou cadastro administrativo.
- Se mantida para desenvolvimento, proteger por segredo (`BOOTSTRAP_SECRET`).

---

## 10. Armazenamento local/offline

O protótipo usa `localforage` para fotos pendentes.

Essa decisão deve ser mantida.

### Regras

- Fotos tiradas pelo convidado ficam salvas no dispositivo até confirmação.
- Se o dispositivo estiver sem internet, as fotos continuam disponíveis localmente.
- O envio só acontece quando o convidado confirma.
- Após envio bem-sucedido, remover fotos locais.
- Após erro de envio, manter fotos locais.

### Chave local recomendada

Usar uma chave que inclua `eventId` e `guestId`:

```txt
eterna:pendingPhotos:{eventId}:{guestId}
```

Evitar usar telefone como parte da chave se não for necessário.

---

## 11. Design system

## 11.1 Estética

- Premium.
- Minimalista.
- Elegante.
- Tema escuro.
- Dourado como cor de destaque.
- Tipografia serifada para marca e nomes.
- Espaçamento generoso.
- Poucos elementos por tela.
- Sensação de convite/evento/casamento.

## 11.2 Cores aproximadas

```txt
background: #050505 / #080808
card: #101010 / #121212
gold: #c9a24d / #d6b45d
gold-bright: #f1d77a
gold-muted: rgba(201, 162, 77, 0.35)
text-main: #f7f0df
text-muted: rgba(247, 240, 223, 0.6)
destructive: vermelho escuro elegante
```

## 11.3 Componentes visuais recorrentes

- `LuxeFrame`: container centralizado, mobile-first, fundo escuro.
- `BrandHeader`: subtítulo pequeno espaçado + título “Eterna Photos”.
- `luxe-card`: card escuro com borda dourada discreta.
- `gold-divider`: divisor fino dourado.
- Botão `gold`: fundo dourado com texto escuro.
- Botão `goldOutline`: borda dourada e fundo escuro.
- Fotos em moldura polaroid.

### Observação importante

Os arquivos enviados não incluem explicitamente `BrandHeader`, `LuxeFrame`, `GuestContext`, `StaffContext`, `data/guests` e `lib/photoStorage`, apesar de as páginas dependerem deles. A reconstrução deve criar esses módulos de forma limpa e compatível com os usos identificados nas páginas.

---

## 12. Módulos a criar/recriar

```txt
src/
  app.tsx
  main.tsx
  index.css
  pages/
    Index.tsx
    Login.tsx
    Home.tsx
    Camera.tsx
    Review.tsx
    StaffLogin.tsx
    CoupleDashboard.tsx
    AdminDashboard.tsx
    NotFound.tsx
  components/
    BrandHeader.tsx
    PolaroidFrame.tsx
    ProtectedStaffRoute.tsx
    ui/*
  contexts/
    GuestContext.tsx
    StaffContext.tsx
  data/
    guests.ts
  lib/
    phone.ts
    photoStorage.ts
    supabasePhotos.ts
    downloadZip.ts
  integrations/
    supabase/
      client.ts
      types.ts
  types/
    domain.ts
supabase/
  functions/
    guest-login/index.ts
    submit-photos/index.ts
    bootstrap-staff/index.ts
  migrations/
```

---

## 13. Regras de negócio obrigatórias

1. Convidado acessa por telefone cadastrado, não por CPF.
2. Telefone deve ser único por evento.
3. Convidado só pode entrar se estiver cadastrado.
4. Convidado não pode enviar mais fotos que seu `photo_limit`.
5. Fotos pendentes contam contra o limite no frontend.
6. Fotos já enviadas contam contra o limite no backend.
7. Backend sempre valida limite antes de salvar.
8. Fotos são vinculadas ao evento e ao convidado.
9. Cada foto deve registrar nome do convidado, telefone normalizado, data e hora.
10. Noivos/admin podem ver todas as fotos do evento.
11. Noivos podem marcar fotos como selecionadas.
12. Download de selecionadas deve gerar `.zip`.
13. Fotos pendentes nunca devem ser apagadas após falha de envio.
14. Ações destrutivas exigem confirmação.
15. Rotas privadas devem proteger acesso por role.
16. Não armazenar credenciais reais no código.
17. Não expor service role key no frontend.
18. Não usar bucket público para fotos privadas do evento.

---

## 14. Lacunas do protótipo que devem ser corrigidas

### 14.1 CPF no fluxo do convidado

O código atual usa CPF em:

- Login do convidado.
- Contexto do convidado.
- Local storage de fotos pendentes.
- Edge Function de login.
- Edge Function de envio.
- Tabela `guests`.
- Tabela `photos`.
- Painel de convidados.
- Agrupamento de fotos.

Tudo isso deve migrar para telefone.

### 14.2 Arquivos ausentes no pacote

As páginas dependem de módulos que não vieram nos zips enviados:

- `@/contexts/GuestContext`
- `@/contexts/StaffContext`
- `@/data/guests`
- `@/lib/photoStorage`
- `@/components/BrandHeader`
- `index.css`
- configuração Tailwind completa

Esses arquivos devem ser recriados conforme o comportamento inferido.

### 14.3 Segurança do bootstrap

A função `bootstrap-staff` do protótipo contém usuários e senhas fixas. Isso pode ser aceitável somente em protótipo local, mas não na versão final.

### 14.4 Multi-evento

O protótipo parece funcionar como evento único com `event_config` singleton. A versão final deve estar preparada para múltiplos eventos, mesmo que inicialmente use apenas um.

### 14.5 Nomenclatura da Edge Function

A função `guess-login` parece ser um typo. A versão final deve usar `guest-login` ou `login-guest`.

---

## 15. Critérios de aceite da versão final

A implementação está correta quando:

- O app compila sem erros TypeScript.
- O login do convidado aceita telefone, não CPF.
- Um telefone cadastrado entra corretamente.
- Um telefone não cadastrado mostra erro claro.
- O dashboard mostra nome, enviadas, pendentes e restantes.
- A câmera abre em mobile e desktop compatível.
- A foto capturada recebe moldura polaroid.
- Fotos pendentes ficam salvas localmente.
- Confirmar envio sobe as fotos para o Supabase Storage.
- O banco registra cada foto com `event_id`, `guest_id`, `guest_name` e `guest_phone_digits`.
- O limite de fotos é respeitado no frontend e backend.
- Noivos conseguem ver galeria agrupada por convidado.
- Noivos conseguem marcar selecionadas.
- Curadoria funciona com pular, voltar e escolher.
- Download das selecionadas gera `.zip`.
- Área admin é restrita a admin.
- Noivos não acessam `/admin`.
- Admin consegue gerenciar fotos, convidados e configurações.
- Nenhuma chave secreta fica exposta no frontend.

---

## 16. Não fazer

- Não recriar o app como algo genérico fora da identidade visual atual.
- Não trocar o estilo premium dark/dourado sem autorização.
- Não substituir telefone por CPF.
- Não manter campos `cpf` na versão final, salvo em migração temporária claramente marcada.
- Não criar dados mockados permanentes no lugar do Supabase.
- Não expor service role key no frontend.
- Não fazer upload direto do convidado para Storage público.
- Não apagar fotos locais antes do servidor confirmar sucesso.
- Não implementar tudo em um único arquivo.
- Não remover a curadoria.
- Não remover o download `.zip`.
- Não ignorar responsividade mobile.

---

## 17. Prompt inicial recomendado para Cursor/Codex

```md
Leia `CONTEXT.md`, `AGENTS.md`, `DATABASE_AND_SUPABASE.md`, `IMPLEMENTATION_PLAN.md`, `package.json`, `app.tsx` e os arquivos em `src/pages`.

Antes de escrever código, faça uma auditoria do projeto atual e responda com:

1. resumo do produto;
2. rotas e fluxos existentes;
3. módulos faltantes;
4. todos os pontos onde CPF precisa virar telefone;
5. proposta de arquitetura final;
6. plano de implementação por fases;
7. lista dos primeiros arquivos que serão criados ou alterados.

Não implemente nada ainda.
```
