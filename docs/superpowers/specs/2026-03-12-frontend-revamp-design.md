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

## 6. Regras de Desenvolvimento

### 6.1 Skills Obrigatórias

**Durante toda a implementação, usar as seguintes skills:**

1. **frontend-design** — estética, tipografia, cores, motion, spatial composition
2. **web-design-guidelines** — acessibilidade, responsividade, performance
3. **vercel-react-best-practices** — otimização React/Next.js, evitar waterfalls, bundle size

**Aplicação:**
- Cada componente deve ser revisado contra as 3 skills
- Code review deve verificar conformidade com as skills
- Testes visuais em ambos os temas (claro/escuro)

### 6.2 Padrões de Código

- Componentes funcionais com TypeScript
- Server Components por padrão, Client Components apenas quando necessário (useState, useEffect, event handlers)
- CSS Modules ou Tailwind (preferir Tailwind com shadcn/ui)
- Nomes de componentes em PascalCase
- Props tipadas com interfaces TypeScript
- Evitar barrel imports (importar direto do arquivo)

### 6.3 Performance

- Lazy load de componentes pesados (next/dynamic)
- Otimizar imagens com next/image
- Fontes com `next/font/google` (Bebas Neue, Inter)
- Evitar waterfalls de fetch (Promise.all, Suspense boundaries)
- Minificar CSS/JS em produção

### 6.4 Acessibilidade

- Contraste WCAG AA (4.5:1 para texto normal)
- Foco visível em todos os elementos interativos
- ARIA labels em botões, links, ícones
- Navegação por teclado completa
- `prefers-reduced-motion` respeitado
- Semantic HTML (nav, main, section, footer)

### 6.5 Responsividade

- Mobile-first
- Breakpoints: 640px (sm), 768px (md), 1024px (lg), 1280px (xl)
- Navbar colapsa em mobile (menu hamburger)
- Grids adaptam: 3 cols (desktop) → 2 cols (tablet) → 1 col (mobile)
- Tabelas com scroll horizontal em mobile

---

## 7. Estrutura de Arquivos

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

## 8. Critérios de Aceite

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

---

## 9. Riscos e Mitigações

| Risco | Mitigação |
|-------|-----------|
| shadcn/ui incompatível com Tailwind v4 | Verificar compatibilidade, ajustar config se necessário |
| Glassmorphism não funciona em navegadores antigos | Fallback para fundo sólido no tema escuro |
| Performance degrada com muitas animações | Respeitar `prefers-reduced-motion`, lazy load |
| Quebra de funcionalidades existentes | Testar cada rota após implementação |
| Inconsistência visual entre temas | Testar ambos os temas em cada componente |

---

## 10. Próximos Passos

1. Criar branch `feature/frontend-revamp`
2. Instalar shadcn/ui e configurar
3. Implementar Fase 1 (design system + layout)
4. Implementar Fases 2-7 (rotas)
5. Testar em ambos os temas
6. Code review com as 3 skills
7. Merge para main

---

**Fim do spec.**
