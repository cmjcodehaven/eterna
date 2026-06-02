# AGENTS.md — Instruções para Codex/Cursor no projeto Eterna Photos

Este arquivo orienta agentes de código ao trabalhar neste repositório.

Antes de alterar código, leia também:

```txt
CONTEXT.md
DATABASE_AND_SUPABASE.md
IMPLEMENTATION_PLAN.md
```

---

## 1. Objetivo do projeto

Eterna Photos é uma aplicação web para eventos/casamentos. Convidados acessam por QR Code, fazem login por **telefone cadastrado**, tiram fotos com estilo polaroid, salvam pendências localmente e confirmam envio para o álbum dos noivos. Noivos e admin acessam área privada para visualizar, curar, selecionar e baixar fotos.

---

## 2. Regras de trabalho do agente

1. Antes de implementar tarefas complexas, faça um plano.
2. Não altere stack sem autorização.
3. Não remova funcionalidades existentes sem explicar.
4. Não use CPF na versão final.
5. Não exponha secrets no frontend.
6. Não coloque `SUPABASE_SERVICE_ROLE_KEY` em código React.
7. Não transforme uploads privados em bucket público.
8. Não apague fotos locais se o envio falhar.
9. Não implemente tudo em um único arquivo.
10. Sempre preserve o design premium dark/dourado.
11. Após alterar código, rode build/lint/test quando disponível.
12. Se uma informação estiver ambígua, registre a suposição antes de implementar.

---

## 3. Stack esperada

- React 18
- TypeScript
- Vite
- React Router DOM
- TailwindCSS
- shadcn/ui + Radix UI
- Supabase JS
- Supabase Database
- Supabase Storage
- Supabase Edge Functions
- localforage
- JSZip
- sonner
- lucide-react

---

## 4. Comandos comuns

```bash
npm install
npm run dev
npm run build
npm run lint
npm run test
```

Se algum comando não existir ou falhar por configuração incompleta, explique o motivo e proponha correção.

---

## 5. Estrutura esperada

```txt
src/
  app.tsx
  main.tsx
  index.css
  pages/
  components/
  contexts/
  data/
  lib/
  integrations/supabase/
  types/
supabase/
  functions/
  migrations/
```

---

## 6. Rotas principais

```txt
/              Login do convidado
/app           Dashboard do convidado
/app/camera    Câmera polaroid
/app/review    Revisão de fotos pendentes
/staff         Login noivos/admin
/couple        Painel dos noivos
/admin         Painel admin
```

---

## 7. Migração obrigatória: CPF para telefone

O protótipo atual contém referências a CPF. Todas devem ser substituídas.

### Substituições obrigatórias

```txt
cpf                  -> phoneDigits / phone
newCpf               -> newPhone
setNewCpf            -> setNewPhone
guest_cpf            -> guest_phone_digits
formatCPF            -> formatPhoneBR
isValidCPFFormat     -> isValidPhoneBR
onlyDigits           -> manter genérico, se útil
guess-login          -> guest-login
```

### Textos da UI

Não usar:

```txt
CPF
Informe seu CPF
CPF inválido
Verifique o CPF
```

Usar:

```txt
Telefone
Informe seu telefone cadastrado
Telefone inválido
Verifique o telefone
```

---

## 8. Padrões de código

- Usar TypeScript com tipos explícitos para entidades de domínio.
- Preferir funções pequenas e nomeadas.
- Separar lógica de UI, domínio e Supabase.
- Evitar duplicação de queries Supabase.
- Criar helpers reutilizáveis em `src/lib`.
- Usar componentes reutilizáveis para header, frame, botões e cards.
- Evitar comentários excessivos; comentar somente decisões importantes.
- Tratar erros com mensagens claras via `toast`.
- Usar loading/disabled states em ações assíncronas.

---

## 9. Design obrigatório

Preservar:

- Fundo preto/dark.
- Dourado como destaque.
- Título “Eterna Photos” em serif.
- Textos pequenos com letter spacing.
- Cards escuros com borda dourada discreta.
- Botões grandes e elegantes.
- Experiência mobile-first.
- Fotos em moldura polaroid.

Não criar design genérico de dashboard SaaS claro.

---

## 10. Segurança

- Staff deve usar Supabase Auth.
- Roles: `couple`, `admin`.
- Convidado não usa Supabase Auth; usa validação por telefone via Edge Function.
- Convidado não acessa diretamente tabelas protegidas nem Storage privado.
- Upload passa por Edge Function.
- RLS deve estar ativado nas tabelas sensíveis.
- Ações destrutivas devem ter confirmação.
- Não manter senhas fixas em código de produção.

---

## 11. Funcionalidades que não podem quebrar

- Login de convidado por telefone.
- Contador de fotos enviadas/pendentes/restantes.
- Câmera e renderização polaroid.
- Salvamento local de fotos pendentes.
- Revisão e exclusão local antes do envio.
- Envio confirmado via Supabase Edge Function.
- Galeria dos noivos agrupada por convidado.
- Seleção persistente de fotos.
- Curadoria com pular/voltar/escolher.
- Download `.zip` das selecionadas.
- Login e roteamento por role para noivos/admin.

---

## 12. Critério de conclusão de qualquer tarefa

Ao finalizar uma alteração, informe:

1. Arquivos alterados.
2. O que foi implementado.
3. Como testar manualmente.
4. Comandos executados e resultado.
5. Riscos, pendências ou suposições.

---

## 13. Primeiro passo recomendado para o agente

Quando iniciar neste repositório, execute mentalmente esta auditoria antes de codar:

```txt
1. Identificar todas as referências a CPF.
2. Identificar módulos ausentes/imports quebrados.
3. Confirmar rotas existentes.
4. Confirmar schema Supabase atual.
5. Planejar migração para telefone.
6. Recriar módulos ausentes com tipos estáveis.
7. Só depois implementar alterações.
```
