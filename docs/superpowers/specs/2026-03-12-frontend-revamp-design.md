# Spec: Repaginação Frontend Bolão Copa 2026

**Data:** 2026-03-12  
**Status:** Aprovado para implementação  
**Branch:** `feature/frontend-revamp`

---

## 1. Visão Geral

Repaginar completamente o frontend do Bolão Copa 2026 seguindo o estilo do protótipo `prototypes/06-hybrid-shadcn`, com:
- Tema claro/escuro (toggle manual + detecção automática)
- shadcn/ui como base de componentes
- Design inspirado no protótipo (cores, tipografia) mas adaptado para padrões shadcn/ui (sem glassmorphism no claro, animações mais sutis)
- Rollout faseado por rota

---

## 2. Design System

### 2.1 Cores

**Tema Claro (padrão inicial)**
```css
--background: #fafafa
--foreground: #111827
--card: #ffffff
--card-foreground: #111827
--border: #e5e7eb
--muted: #f3f4f6
--muted-foreground: #6b7280
--primary: #00A651
--primary-foreground: #ffffff
--accent: #FFD700
--accent-foreground: #1a1a1a
```

**Tema Escuro**
```css
--background: #0a0e1a
--foreground: #e2e8f0
--card: rgba(26, 31, 46, 0.7)
--card-foreground: #e2e8f0
--border: rgba(255, 255, 255, 0.1)
--muted: #151b2e
--muted-foreground: #8892a8
--primary: #00A651
--primary-foreground: #ffffff
--accent: #FFD700
--accent-foreground: #1a1a1a
```

### 2.2 Tipografia

- **Display:** `Bebas Neue` — títulos, números grandes (ranking, placares)
- **Body:** `Inter` — texto, UI, labels

### 2.3 Componentes (shadcn/ui)

**Primitivos (shadcn/ui padrão)**
- Button, Card, Table, Badge, Modal, Tabs, Select, Input, Accordion

**Custom (específicos do projeto)**
- `GameCard` — card de jogo com times, placar, data, botão "Ver Palpites"
- `RankingPodium` — top 3 com avatares coloridos (ouro/prata/bronze)
- `RankingTable` — tabela completa com posição, avatar, pontos, exatas, vencedores, progresso
- `ParticipantCard` — card de participante com foto, nome, estatísticas
- `StatsCard` — card de estatística com ícone, valor, label, descrição

### 2.4 Estilo Visual

**Tema Claro**
- Cards: fundo branco, borda `#e5e7eb`, sombra sutil `box-shadow: 0 1px 3px rgba(0,0,0,0.06)`
- Hover: borda verde, sombra verde suave, `translateY(-4px)`
- Navbar: branca translúcida com `backdrop-filter: blur(20px)`, borda superior verde 3px
- Links ativos: underline dourado 2px

**Tema Escuro**
- Cards: glassmorphism com `backdrop-filter: blur(12px)`, borda translúcida
- Hover: borda verde, glow verde, `translateY(-4px)`
- Navbar: fundo translúcido escuro com blur, borda superior verde 2px
- Links ativos: underline dourado 2px

**Animações**
- Fade-in-up no load (0.6s ease-out)
- Hover em cards: 0.3s ease
- Progress bars: shimmer animation 2.5s infinite
- Respeitar `prefers-reduced-motion`

---

## 3. Toggle de Tema

### 3.1 Comportamento

1. **Detecção automática:** `prefers-color-scheme` do sistema operacional
2. **Override manual:** botão no header (ícone sol/lua)
3. **Persistência:** `localStorage` com chave `theme-preference`
4. **Prioridade:** localStorage > prefers-color-scheme > padrão (claro)

### 3.2 Implementação

- `ThemeProvider` em `src/components/providers/theme-provider.tsx`
- Hook `useTheme()` para acessar tema atual
- Classes CSS: `<html class="light">` ou `<html class="dark">`
- Script inline no `<head>` para evitar flash (FOUC)

### 3.3 UI do Toggle

- Botão no header, ao lado do avatar
- Ícone: sol (tema claro) / lua (tema escuro)
- Transição suave entre temas (0.3s)

---

## 4. Estrutura de Rollout

### Fase 1: Design System + Layout Global
- Instalar shadcn/ui (configurar para Tailwind v4)
- Criar ThemeProvider com toggle
- Refatorar Header (Navbar) com tema claro/escuro
- Refatorar Footer
- Criar layout global com variáveis CSS

### Fase 2: Home (`/`)
- Hero section com stats (participantes, jogos, prêmio)
- StatsGrid (3 cards: participantes ativos, jogos, premiação)
- GameCard (jogos do dia)
- RankingCard (top 3 ranking)

### Fase 3: Jogos (`/jogos`)
- Page header com título e subtítulo
- FilterTabs (Todos, Grupo A, Grupo B, etc., Encerrados)
- GameCards agrupados por fase/grupo

### Fase 4: Ranking (`/ranking`)
- Stats summary (maior pontuação, média, placares exatos)
- RankingPodium (top 3 com avatares coloridos)
- RankingTable (tabela completa com todas as colunas)

### Fase 5: Participantes (`/participantes`)
- Grid de ParticipantCards
- Avatar com iniciais ou foto
- Estatísticas individuais (pontos, exatas, vencedores)

### Fase 6: Regras (`/regras`)
- Content layout com Accordion
- Seções: pontuação, desempate, extras, premiação

### Fase 7: Admin (`/admin/*`)
- Dashboard com stats cards
- Upload form (participante, arquivo, preview)
- Tables para gerenciar jogos, participantes, resultados
- Forms para configurar pontuação
- Mesmo estilo visual das páginas públicas

---

## 5. Adaptações do Protótipo

| Elemento | Protótipo | Implementação |
|----------|-----------|---------------|
| Glassmorphism | Sempre presente | Apenas no tema escuro |
| Animações | Intensas | Sutis, respeitar `prefers-reduced-motion` |
| Bordas | Translúcidas | Claras no light, translúcidas no dark |
| Sombras | Box-shadow no light, glow no dark | Conforme tema |
| Hover | translateY(-4px) + glow | Manter, mas glow mais sutil no light |

---

## 6. Elementos de UX e Feedback

### 6.1 Toasts (Notificações)

**Componente:** shadcn/ui Sonner (toast)

**Casos de uso:**
- Upload de planilha bem-sucedido: "Palpites de [nome] importados com sucesso!"
- Erro ao salvar: "Erro ao salvar configurações. Tente novamente."
- Ação confirmada: "Resultados atualizados!"
- Validação: "Arquivo inválido. Use Excel, PDF ou imagem."

**Comportamento:**
- Posição: bottom-right (desktop), bottom-center (mobile)
- Duração: 4 segundos (sucesso/info), 6 segundos (erro/warning)
- Dismissível: botão X ou swipe
- Tipos: success (verde), error (vermelho), warning (amarelo), info (azul)

**Implementação:**
```tsx
import { toast } from "sonner"

toast.success("Palpites importados!")
toast.error("Erro ao salvar. Tente novamente.")
```

### 6.2 Loading States

**Skeletons (shadcn/ui Skeleton)**
- Cards de jogos, ranking, participantes: skeleton com formato do conteúdo
- Tabelas: skeleton rows (5 linhas)
- Stats: skeleton blocks

**Spinners**
- Botões em ação: spinner interno + texto "Salvando..."
- Upload de arquivo: progress bar + porcentagem
- Fetch de dados: spinner centralizado com texto "Carregando..."

**Progress Bars**
- Upload de arquivo: barra de progresso real (0-100%)
- Sync de resultados: barra indeterminada (shimmer)

### 6.3 Empty States

**Quando exibir:**
- Lista de jogos sem jogos agendados
- Ranking sem dados (início do bolão)
- Participantes sem participantes cadastrados
- Busca sem resultados

**Estrutura:**
- Ícone ilustrativo (emoji ou SVG)
- Título: "Nenhum jogo encontrado"
- Descrição: "Os jogos da fase de grupos serão exibidos aqui."
- Ação (opcional): botão "Ver regras" ou "Voltar ao início"

**Exemplo:**
```tsx
<div className="flex flex-col items-center justify-center py-12">
  <span className="text-6xl mb-4">⚽</span>
  <h3 className="text-xl font-semibold mb-2">Nenhum jogo encontrado</h3>
  <p className="text-muted-foreground text-center max-w-md">
    Os jogos da fase de grupos serão exibidos aqui em breve.
  </p>
</div>
```

### 6.4 Error States

**Error Boundary (global)**
- Captura erros de React
- Exibe tela de erro com mensagem amigável
- Botão "Tentar novamente" ou "Voltar ao início"

**Error em componentes:**
- Falha ao carregar dados: card com ícone de erro + mensagem + botão retry
- Formulário com erro: mensagens inline abaixo dos campos
- API error: toast + fallback UI

**Exemplo:**
```tsx
<div className="flex flex-col items-center justify-center py-12">
  <span className="text-6xl mb-4">❌</span>
  <h3 className="text-xl font-semibold mb-2">Erro ao carregar dados</h3>
  <p className="text-muted-foreground text-center max-w-md mb-4">
    Não foi possível carregar o ranking. Tente novamente.
  </p>
  <Button onClick={retry}>Tentar novamente</Button>
</div>
```

### 6.5 Confirmation Dialogs

**Quando usar:**
- Ações destrutivas: "Excluir participante?"
- Confirmações importantes: "Confirmar upload de palpites?"
- Sync de resultados: "Sincronizar resultados ao vivo?"

**Estrutura (shadcn/ui AlertDialog):**
- Título: "Tem certeza?"
- Descrição: "Esta ação não pode ser desfeita."
- Botões: "Cancelar" (outline) + "Confirmar" (destructive/primary)

**Exemplo:**
```tsx
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Excluir participante?</AlertDialogTitle>
      <AlertDialogDescription>
        Esta ação removerá todos os palpites de João Silva. Esta ação não pode ser desfeita.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 6.6 Form Feedback

**Validação inline:**
- Erro abaixo do campo: texto vermelho + ícone
- Campo inválido: borda vermelha
- Campo válido: borda verde (opcional)

**Submit states:**
- Botão desabilitado durante submit
- Spinner interno + texto "Salvando..."
- Toast de sucesso/erro após conclusão

**Exemplo:**
```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Salvando...
    </>
  ) : (
    "Salvar"
  )}
</Button>
```

### 6.7 Tooltips

**Quando usar:**
- Ícones sem label: "Ver palpites", "Editar", "Excluir"
- Informações adicionais: "Placar exato (10 pontos)"
- Ações em tabelas: botões de ação com ícones

**Implementação:** shadcn/ui Tooltip
- Delay: 200ms antes de exibir
- Posição: top (padrão), bottom se não houver espaço

### 6.8 Transitions

**Page transitions:**
- Fade-in ao navegar entre rotas (0.3s)
- Skeleton durante loading (não bloqueia interação)

**Component transitions:**
- Modal: fade + scale (0.2s)
- Toast: slide-in from right (0.3s)
- Accordion: smooth expand/collapse (0.3s)

---

## 7. Regras de Desenvolvimento

### 7.1 Skills Obrigatórias

**Durante toda a implementação, usar as seguintes skills:**

1. **frontend-design** — estética, tipografia, cores, motion, spatial composition
2. **web-design-guidelines** — acessibilidade, responsividade, performance
3. **vercel-react-best-practices** — otimização React/Next.js, evitar waterfalls, bundle size

**Aplicação:**
- Cada componente deve ser revisado contra as 3 skills
- Code review deve verificar conformidade com as skills
- Testes visuais em ambos os temas (claro/escuro)

### 7.2 Padrões de Código

- Componentes funcionais com TypeScript
- Server Components por padrão, Client Components apenas quando necessário (useState, useEffect, event handlers)
- CSS Modules ou Tailwind (preferir Tailwind com shadcn/ui)
- Nomes de componentes em PascalCase
- Props tipadas com interfaces TypeScript
- Evitar barrel imports (importar direto do arquivo)

### 7.3 Performance

- Lazy load de componentes pesados (next/dynamic)
- Otimizar imagens com next/image
- Fontes com `next/font/google` (Bebas Neue, Inter)
- Evitar waterfalls de fetch (Promise.all, Suspense boundaries)
- Minificar CSS/JS em produção

### 7.4 Acessibilidade

- Contraste WCAG AA (4.5:1 para texto normal)
- Foco visível em todos os elementos interativos
- ARIA labels em botões, links, ícones
- Navegação por teclado completa
- `prefers-reduced-motion` respeitado
- Semantic HTML (nav, main, section, footer)

### 7.5 Responsividade

- Mobile-first
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Navbar colapsa em mobile (menu hamburger)
- Grids adaptam: 3 cols (desktop) → 2 cols (tablet) → 1 col (mobile)
- Tabelas com scroll horizontal em mobile

---

## 8. Estrutura de Arquivos

```
src/
  app/
    layout.tsx (ThemeProvider global)
    (public)/
      page.tsx (home)
      jogos/page.tsx
      ranking/page.tsx
      participantes/page.tsx
      regras/page.tsx
    admin/
      layout.tsx
      page.tsx (dashboard)
      upload/page.tsx
      jogos/page.tsx
      participantes/page.tsx
      resultados/page.tsx
      config/page.tsx
  components/
    providers/
      theme-provider.tsx
    layout/
      header.tsx
      footer.tsx
      theme-toggle.tsx
    ui/ (shadcn/ui)
      button.tsx
      card.tsx
      table.tsx
      badge.tsx
      modal.tsx
      tabs.tsx
      select.tsx
      input.tsx
      accordion.tsx
      toast.tsx (Sonner)
      skeleton.tsx
      alert-dialog.tsx
      tooltip.tsx
      alert.tsx
    public/
      hero.tsx
      stats-card.tsx
      game-card.tsx
      ranking-card.tsx
      ranking-podium.tsx
      ranking-table.tsx
      participant-card.tsx
    admin/
      upload-form.tsx
      preview-table.tsx
      stats-card.tsx
  lib/
    theme.ts (lógica de tema, localStorage)
    utils.ts (cn helper do shadcn)
```

---

## 9. Critérios de Aceite

- [ ] Tema claro/escuro funcionando com toggle manual
- [ ] Detecção automática de `prefers-color-scheme`
- [ ] Persistência em `localStorage`
- [ ] Todas as páginas públicas repaginadas (home, jogos, ranking, participantes, regras)
- [ ] Painel admin completo repaginado
- [ ] shadcn/ui instalado e configurado
- [ ] Componentes reutilizáveis criados
- [ ] Responsivo (mobile, tablet, desktop)
- [ ] Acessível (WCAG AA, navegação por teclado)
- [ ] Performance otimizada (Lighthouse score > 90)
- [ ] Funcionalidades existentes preservadas (upload, ranking, resultados)
- [ ] Código revisado com as 3 skills (frontend-design, web-design-guidelines, vercel-react-best-practices)
- [ ] Toasts implementados para feedback de ações (sucesso, erro, warning, info)
- [ ] Loading states com skeletons e spinners
- [ ] Empty states para listas vazias
- [ ] Error states com retry
- [ ] Confirmation dialogs para ações destrutivas
- [ ] Tooltips em ícones e ações

---

## 10. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| shadcn/ui incompatível com Tailwind v4 | Verificar compatibilidade, ajustar config se necessário |
| Glassmorphism não funciona em navegadores antigos | Fallback para fundo sólido no tema escuro |
| Performance degrada com muitas animações | Respeitar `prefers-reduced-motion`, lazy load |
| Quebra de funcionalidades existentes | Testar cada rota após implementação |
| Inconsistência visual entre temas | Testar ambos os temas em cada componente |

---

## 11. Próximos Passos

1. Criar branch `feature/frontend-revamp`
2. Instalar shadcn/ui e configurar
3. Implementar Fase 1 (design system + layout)
4. Implementar Fases 2-7 (rotas)
5. Testar em ambos os temas
6. Code review com as 3 skills
7. Merge para main

---

**Fim do spec.**
