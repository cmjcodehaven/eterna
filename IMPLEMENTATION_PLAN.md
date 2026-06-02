# IMPLEMENTATION_PLAN.md — Plano de reconstrução robusta do Eterna Photos

> Plano incremental para recriar o app com base no protótipo da Lovable, nos prints e no contexto final.

---

## Fase 0 — Auditoria inicial

### Objetivo

Entender o estado real do projeto antes de implementar.

### Tarefas

- [ ] Rodar `npm install`.
- [ ] Rodar `npm run build`.
- [ ] Identificar imports quebrados.
- [ ] Confirmar quais arquivos existem em `src/`.
- [ ] Confirmar se `index.css`, `tailwind.config` e alias `@/` existem.
- [ ] Listar todas as referências a CPF.
- [ ] Listar dependências Supabase.
- [ ] Confirmar migrations e Edge Functions existentes.

### Saída esperada

Um relatório curto com:

```txt
- erros de build;
- arquivos faltantes;
- referências CPF;
- rotas confirmadas;
- plano de correção.
```

---

## Fase 1 — Base visual e estrutura

### Objetivo

Garantir que o app tenha estrutura limpa e identidade visual fiel aos prints.

### Tarefas

- [ ] Criar/ajustar `src/index.css`.
- [ ] Configurar Tailwind e tokens de cor.
- [ ] Criar `BrandHeader`.
- [ ] Criar `LuxeFrame`.
- [ ] Garantir variantes de botão `gold`, `goldOutline` e `luxe`.
- [ ] Garantir cards com classe `luxe-card`.
- [ ] Garantir divisor `gold-divider`.
- [ ] Revisar responsividade mobile.

### Critério de aceite

As telas principais devem lembrar visualmente os prints:

- fundo escuro;
- título serifado;
- dourado elegante;
- cards minimalistas;
- botões largos;
- mobile-first.

---

## Fase 2 — Tipos e helpers de domínio

### Objetivo

Criar uma base de tipos estável e substituir CPF por telefone.

### Tarefas

- [ ] Criar `src/types/domain.ts`.
- [ ] Criar `src/lib/phone.ts`.
- [ ] Criar/ajustar `src/data/guests.ts`.
- [ ] Remover helpers `formatCPF` e `isValidCPFFormat`.
- [ ] Criar `formatPhoneBR`, `normalizePhoneBR`, `isValidPhoneBR`.

### Tipos esperados

```ts
export type GuestType = "guest" | "sponsor";

export interface GuestSession {
  id: string;
  eventId: string;
  name: string;
  phoneDigits: string;
  guestType: GuestType;
  photoLimit: number;
  uploadedCount: number;
}

export interface PhotoItem {
  id: string;
  eventId: string;
  guestId: string;
  guestName: string;
  guestPhoneDigits: string;
  storagePath: string;
  url?: string;
  selected: boolean;
  createdAt: string;
}
```

---

## Fase 3 — Contexto do convidado

### Objetivo

Recriar `GuestContext` com login por telefone e sessão local.

### Tarefas

- [ ] Criar `src/contexts/GuestContext.tsx`.
- [ ] Implementar `login(phone)` chamando Edge Function `guest-login`.
- [ ] Persistir sessão local do convidado.
- [ ] Implementar `logout()`.
- [ ] Implementar `refreshUploadedCount()`.
- [ ] Atualizar `Login.tsx` para telefone.
- [ ] Atualizar `Home.tsx` para `guest.id`/`guest.phoneDigits`.

### Critério de aceite

- Telefone cadastrado entra.
- Telefone inválido bloqueia.
- Telefone não cadastrado mostra erro.
- CPF não aparece na tela.

---

## Fase 4 — Storage local de fotos pendentes

### Objetivo

Garantir funcionamento offline até confirmação de envio.

### Tarefas

- [ ] Criar `src/lib/photoStorage.ts` com localforage.
- [ ] Usar chave por `eventId + guestId`.
- [ ] Implementar:
  - `savePhoto`
  - `listPhotosByGuest`
  - `deletePhoto`
  - `clearPhotosByGuest`
- [ ] Atualizar `Camera.tsx`.
- [ ] Atualizar `Review.tsx`.

### Critério de aceite

- Foto tirada aparece em pendentes.
- Foto pendente persiste ao recarregar página.
- Foto pendente pode ser apagada.
- Falha de envio não apaga fotos locais.

---

## Fase 5 — Câmera e renderização polaroid

### Objetivo

Manter a experiência visual do protótipo.

### Tarefas

- [ ] Revisar `Camera.tsx`.
- [ ] Garantir uso de `getUserMedia`.
- [ ] Garantir botão de captura.
- [ ] Garantir cálculo de limite: enviadas + pendentes.
- [ ] Garantir canvas polaroid.
- [ ] Adicionar fallback para erro de câmera.
- [ ] Parar stream ao desmontar componente.

### Critério de aceite

- Câmera abre.
- Foto gerada tem moldura polaroid.
- Nome do convidado aparece na moldura.
- Limite é respeitado.

---

## Fase 6 — Supabase Database e Storage

### Objetivo

Criar schema final com telefone.

### Tarefas

- [ ] Criar migration nova com `events`, `guests`, `photos`, `profiles`, `user_roles`.
- [ ] Remover/evitar schema baseado em CPF.
- [ ] Criar bucket privado `event-photos`.
- [ ] Criar RLS.
- [ ] Criar policies.
- [ ] Atualizar `types.ts` após aplicar migration.

### Critério de aceite

- Não existe dependência funcional de `cpf`.
- `guests.phone_digits` é único por evento.
- `photos` referencia `event_id` e `guest_id`.
- Storage privado funciona com URLs assinadas.

---

## Fase 7 — Edge Functions

### Objetivo

Recriar backend seguro para login e upload.

### Tarefas

- [ ] Criar `supabase/functions/guest-login/index.ts`.
- [ ] Atualizar/remover `guess-login`.
- [ ] Atualizar `submit-photos` para telefone.
- [ ] Validar limite no backend.
- [ ] Não usar CPF nos FormData.
- [ ] Usar caminhos de storage sem telefone exposto.

### Critério de aceite

- Login por telefone retorna convidado.
- Upload salva storage + banco.
- Exceder limite retorna erro.
- Fotos não são salvas parcialmente sem controle.

---

## Fase 8 — Painel dos noivos

### Objetivo

Recriar `/couple` com galeria, curadoria e convidados.

### Tarefas

- [ ] Garantir `StaffContext` com role `couple`.
- [ ] Carregar fotos com URLs assinadas.
- [ ] Agrupar por convidado.
- [ ] Implementar seleção persistente.
- [ ] Implementar seleção manual temporária.
- [ ] Implementar download `.zip`.
- [ ] Implementar curadoria.
- [ ] Atualizar formulário de convidados para telefone.

### Critério de aceite

- Noivos veem fotos agrupadas.
- Noivos selecionam favoritos.
- Curadoria funciona.
- Download `.zip` funciona.
- Convidados são adicionados por telefone.

---

## Fase 9 — Painel admin

### Objetivo

Recriar `/admin` para controle total.

### Tarefas

- [ ] Proteger rota por role `admin`.
- [ ] Exibir estatísticas.
- [ ] Listar fotos.
- [ ] Apagar foto individual.
- [ ] Limpar todas as fotos com confirmação.
- [ ] Gerenciar convidados por telefone.
- [ ] Editar configurações do evento.

### Critério de aceite

- Admin acessa `/admin`.
- Couple não acessa `/admin`.
- Ações destrutivas exigem confirmação.
- Dados atualizam após operação.

---

## Fase 10 — Testes e refinamento

### Testes manuais obrigatórios

- [ ] Login convidado telefone válido.
- [ ] Login convidado telefone inválido.
- [ ] Login convidado telefone inexistente.
- [ ] Tirar 1 foto.
- [ ] Tirar várias fotos até o limite.
- [ ] Tentar passar do limite.
- [ ] Recarregar página e conferir pendentes.
- [ ] Confirmar envio.
- [ ] Simular erro de internet e garantir que pendentes não somem.
- [ ] Login noivos.
- [ ] Ver galeria.
- [ ] Selecionar foto.
- [ ] Fazer curadoria.
- [ ] Baixar `.zip`.
- [ ] Login admin.
- [ ] Adicionar convidado.
- [ ] Bloquear telefone duplicado.

### Comandos

```bash
npm run build
npm run lint
npm run test
```

---

## Prompt por fase recomendado

### Prompt 1 — Auditoria

```md
Leia `CONTEXT.md`, `AGENTS.md`, `DATABASE_AND_SUPABASE.md` e o código atual.
Faça apenas uma auditoria. Não altere arquivos ainda.
Liste imports quebrados, referências a CPF, lacunas de schema, módulos ausentes e plano de correção.
```

### Prompt 2 — Migração base para telefone

```md
Implemente a Fase 2 e Fase 3 do `IMPLEMENTATION_PLAN.md`.
Substitua CPF por telefone no login do convidado e crie os helpers necessários.
Não mexa ainda em Supabase migrations.
Ao final, informe arquivos alterados e como testar.
```

### Prompt 3 — Banco e Edge Functions

```md
Implemente a Fase 6 e Fase 7.
Crie migrations e Edge Functions baseadas em telefone conforme `DATABASE_AND_SUPABASE.md`.
Não exponha service role no frontend.
```

### Prompt 4 — Fotos pendentes e envio

```md
Implemente a Fase 4 e ajuste `Camera.tsx`/`Review.tsx` para usar `eventId` e `guestId`, não CPF.
Garanta que fotos pendentes não sejam apagadas em caso de falha.
```

### Prompt 5 — Painel dos noivos

```md
Implemente a Fase 8.
Atualize galeria, curadoria e convidados para telefone.
Preserve o layout dos prints e o comportamento do protótipo.
```

### Prompt 6 — Admin e refinamento

```md
Implemente a Fase 9 e revise critérios de aceite.
Rode build/lint/test e corrija erros sem mudar a identidade visual.
```
