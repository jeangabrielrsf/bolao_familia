# Redesign Chaveamento — Dois Lados com Conectores

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesenhar a aba Chaveamento com layout de dois lados (SF-1/SF-2) convergindo ao centro, conectores SVG entre fases, e mobile com swipe por fase.

**Architecture:** 5 protótipos HTML standalone na pasta `prototypes/`, 7 novos componentes React, refatoração do `Bracket` existente. Nenhuma alteração nos dados — `BracketSlot[]` e `projetarChaveamento()` permanecem inalterados.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, SVG inline

---

## Estrutura de Arquivos

```
src/components/public/
  bracket-two-sided.tsx     (NOVO) — Container desktop: lado esquerdo + centro + lado direito
  bracket-side.tsx          (NOVO) — Um lado (R32→Oitavas→QF→SF) com match cards + conectores
  bracket-center.tsx        (NOVO) — Final + 3º lugar no centro
  bracket-connectors.tsx    (NOVO) — SVG overlay com linhas de conexão entre fases
  bracket-match-card.tsx    (NOVO) — Card de confronto substituindo BracketMatch
  bracket-mobile.tsx        (NOVO) — Carrossel swipe de fases para mobile
  bracket-phase-dots.tsx    (NOVO) — Indicador dots da fase atual
  bracket.tsx               (MODIFICAR) — Renderiza BracketTwoSided ou BracketMobile
  bracket-grid.tsx          (REMOVER)
  bracket-column.tsx        (REMOVER)
  bracket-match.tsx         (REMOVER — substituído por bracket-match-card.tsx)
  simulator-tab.tsx         (MODIFICAR) — Adaptar import do Bracket (interface mantida)
  bracket-lado-utils.ts     (NOVO) — Função getLadoSlot() + agrupamento SF

src/components/public/__tests__/
  bracket-match-card.test.tsx  (NOVO) — Testes do card de confronto
  bracket-mobile.test.tsx      (NOVO) — Testes do carrossel mobile
  bracket.test.tsx             (MODIFICAR) — Atualizar para novos componentes

prototypes/
  01-straight-lines.html       (NOVO) — Conectores retos, minimalista
  02-curved-lines.html         (NOVO) — Conectores bezier, visual orgânico
  03-dark-themed.html          (NOVO) — Tema escuro, cards polidos
  04-compact-mobile.html       (NOVO) — Mobile swipe funcional
  05-animated.html             (NOVO) — Animações e path highlighting
```

---

### Task 1: Protótipo 1 — Conectores retos minimalistas

**Files:**
- Create: `prototypes/01-straight-lines.html`

- [ ] **Step 1: Criar HTML standalone com conectores retos**

Conteúdo do arquivo:

```html
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Protótipo 1: Conectores Retos</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: #0f172a; color: #e2e8f0; font-family: system-ui; margin: 0; padding: 16px; }
  .connector-h { position: absolute; border-top: 1px solid #475569; }
  .connector-v { position: absolute; border-left: 1px solid #475569; }
  .match-card { background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 6px 10px; min-width: 120px; position: relative; }
  .match-card.winner { border-color: #10b981; }
  .match-card.winner .winner-row { background: #064e3b; border-radius: 4px; margin: 0 -6px; padding: 0 6px; }
  .bracket-container { position: relative; overflow-x: auto; }
  .bracket-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
</style>
</head>
<body>
<h1 style="font-size:18px;margin-bottom:16px;color:#94a3b8">Protótipo 1 — Conectores Retos Minimalistas</h1>
<p style="font-size:12px;color:#64748b;margin-bottom:20px">Linhas horizontais + verticais de 1px, sem curvas. Cores neutras.</p>

<div class="bracket-container" style="min-width:800px;height:500px;position:relative">
  <!-- SVG connectors -->
  <svg class="bracket-svg" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet">
    <!-- Coluna R32 → Oitavas: pares de matches se juntam -->
    <!-- Par 1: match 0,1 → Oit1 -->
    <line x1="125" y1="55" x2="145" y2="55" stroke="#475569" stroke-width="1"/>
    <line x1="145" y1="55" x2="145" y2="95" stroke="#475569" stroke-width="1"/>
    <line x1="125" y1="135" x2="145" y2="135" stroke="#475569" stroke-width="1"/>
    <line x1="145" y1="135" x2="145" y2="95" stroke="#475569" stroke-width="1"/>
    <line x1="145" y1="95" x2="160" y2="95" stroke="#475569" stroke-width="1"/>
    <polygon points="156,91 156,99 150,95" fill="#64748b"/>

    <!-- Par 2: match 2,3 → Oit2 -->
    <line x1="125" y1="225" x2="145" y2="225" stroke="#475569" stroke-width="1"/>
    <line x1="145" y1="225" x2="145" y2="265" stroke="#475569" stroke-width="1"/>
    <line x1="125" y1="305" x2="145" y2="305" stroke="#475569" stroke-width="1"/>
    <line x1="145" y1="305" x2="145" y2="265" stroke="#475569" stroke-width="1"/>
    <line x1="145" y1="265" x2="160" y2="265" stroke="#475569" stroke-width="1"/>
    <polygon points="156,261 156,269 150,265" fill="#64748b"/>

    <!-- Oitavas → Quartas: match Oit1,Oit2 → QF1 -->
    <line x1="285" y1="95" x2="310" y2="95" stroke="#475569" stroke-width="1"/>
    <line x1="310" y1="95" x2="310" y2="275" stroke="#475569" stroke-width="1"/>
    <line x1="285" y1="265" x2="310" y2="265" stroke="#475569" stroke-width="1"/>
    <line x1="310" y1="275" x2="330" y2="275" stroke="#475569" stroke-width="1"/>
    <polygon points="326,271 326,279 320,275" fill="#64748b"/>

    <!-- Quartas → Semi: match QF1 → SF1 -->
    <line x1="455" y1="275" x2="485" y2="275" stroke="#475569" stroke-width="1"/>

    <!-- Semi → Final (centro) -->
    <line x1="595" y1="275" x2="640" y2="275" stroke="#475569" stroke-width="1"/>
    <polygon points="636,271 636,279 630,275" fill="#64748b"/>
  </svg>

  <!-- Cards posicionados absolutamente -->
  <div style="position:absolute;left:5px;top:40px"><div class="match-card winner">🇧🇷 Brasil <span style="color:#10b981;float:right">3</span><br>🇵🇹 Portugal <span style="float:right">1</span></div></div>
  <div style="position:absolute;left:5px;top:120px"><div class="match-card">🇦🇷 Argentina <span>—</span><br>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra <span>—</span></div></div>
  <div style="position:absolute;left:5px;top:210px"><div class="match-card" style="opacity:0.5">1C vs 2D</div></div>
  <div style="position:absolute;left:5px;top:290px"><div class="match-card" style="opacity:0.5">1E vs 2F</div></div>
  <div style="position:absolute;left:160px;top:83px"><div class="match-card" style="opacity:0.5">Venc.M1 vs Venc.M2</div></div>
  <div style="position:absolute;left:160px;top:253px"><div class="match-card" style="opacity:0.5">Venc.M3 vs Venc.M4</div></div>
  <div style="position:absolute;left:335px;top:263px"><div class="match-card" style="opacity:0.5">Venc.O1 vs Venc.O2</div></div>
  <div style="position:absolute;left:490px;top:263px"><div class="match-card" style="opacity:0.5">Venc.Q1 vs Venc.Q2</div></div>
  <div style="position:absolute;left:645px;top:260px"><div class="match-card" style="border-color:#fbbf24;border-width:2px">🏆 FINAL</div></div>
</div>
</body>
</html>
```

- [ ] **Step 2: Verificar que abre no navegador**

```bash
open prototypes/01-straight-lines.html || xdg-open prototypes/01-straight-lines.html
```

- [ ] **Step 3: Commit**

```bash
git add prototypes/01-straight-lines.html
git commit -m "feat: protótipo 1 - conectores retos minimalistas"
```

---

### Task 2: Protótipo 2 — Conectores com curvas bezier

**Files:**
- Create: `prototypes/02-curved-lines.html`

- [ ] **Step 1: Criar HTML com curvas bezier nos conectores**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Protótipo 2: Curvas Bezier</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: #0f172a; color: #e2e8f0; font-family: system-ui; margin: 0; padding: 16px; }
  .match-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 8px 12px; min-width: 130px; position: absolute; }
  .match-card.winner { border-color: #10b981; }
  .hero-match { border-color: #fbbf24 !important; border-width: 2px !important; background: #1a2a1a !important; }
  .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 1px; position: absolute; }
</style>
</head>
<body>
<h1 style="font-size:18px;margin-bottom:8px;color:#94a3b8">Protótipo 2 — Curvas Bezier</h1>
<p style="font-size:12px;color:#64748b;margin-bottom:20px">Conectores com path SVG curvo (C/quadratic bezier), visual mais orgânico.</p>

<div style="position:relative;width:900px;height:650px;overflow-x:auto;background:#0a0f1a;border-radius:12px;padding:20px">
  <!-- Labels -->
  <div class="label" style="left:20px;top:30px">16 AVOS</div>
  <div class="label" style="left:180px;top:30px">OITAVAS</div>
  <div class="label" style="left:340px;top:30px">QUARTAS</div>
  <div class="label" style="left:500px;top:30px">SEMI</div>
  <div class="label" style="left:660px;top:30px">FINAL</div>

  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none">
    <!-- R32 par 1 → Oit1: curvas bezier -->
    <path d="M 160 65 C 175 65, 175 65, 180 65 L 190 65 L 190 95 C 190 100, 190 105, 185 105 L 180 105" stroke="#475569" stroke-width="1.2" fill="none"/>
    <path d="M 160 145 C 175 145, 175 145, 180 145 L 190 145 L 190 105" stroke="#475569" stroke-width="1.2" fill="none"/>

    <!-- R32 par 2 → Oit2 -->
    <path d="M 160 235 C 175 235, 175 235, 180 235 L 190 235 L 190 195" stroke="#475569" stroke-width="1.2" fill="none"/>
    <path d="M 160 315 C 175 315, 175 315, 180 315 L 190 315 L 190 195" stroke="#475569" stroke-width="1.2" fill="none"/>

    <!-- Oit1,Oit2 → QF1 -->
    <path d="M 325 105 C 340 105, 340 185, 335 185" stroke="#475569" stroke-width="1.2" fill="none"/>
    <path d="M 335 185 L 340 185 L 348 185" stroke="#475569" stroke-width="1.2" fill="none"/>

    <!-- QF1 → SF1 -->
    <path d="M 500 195 C 520 195, 530 210, 535 210 L 540 210 L 548 210" stroke="#475569" stroke-width="1.2" fill="none"/>

    <!-- SF1 → Final (curva suave ao centro) -->
    <path d="M 680 210 C 700 210, 710 280, 710 280 L 710 285 L 712 285" stroke="#fbbf24" stroke-width="1.5" fill="none"/>
    <polygon points="708,281 708,289 702,285" fill="#fbbf24"/>

    <!-- 3º lugar -->
    <path d="M 680 210 L 710 210 L 710 340 L 715 340" stroke="#64748b" stroke-width="1" fill="none" stroke-dasharray="3,3"/>
    <text x="680" y="340" fill="#64748b" font-size="8" text-anchor="middle">Perdedores SF → 3º lugar</text>
  </svg>

  <!-- Match cards posicionadas -->
  <div class="match-card" style="left:30px;top:50px">🇧🇷 Brasil <span style="color:#10b981;float:right;font-weight:600">3</span><br>🇵🇹 Portugal <span style="float:right">1</span><br><span style="font-size:9px;color:#64748b">FT · Los Angeles</span></div>
  <div class="match-card" style="left:30px;top:130px">🇦🇷 Argentina <span>—</span><br>🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra <span>—</span><br><span style="font-size:9px;color:#64748b">29/06 · 15:00</span></div>
  <div class="match-card" style="left:30px;top:220px;opacity:0.5">1C vs 2D<br><span style="font-size:9px;color:#64748b">30/06 · 13:00</span></div>
  <div class="match-card" style="left:30px;top:300px;opacity:0.5">1E vs 2F</div>
  <div class="match-card" style="left:185px;top:93px;opacity:0.5">Venc.M1 vs Venc.M2</div>
  <div class="match-card" style="left:185px;top:183px;opacity:0.5">Venc.M3 vs Venc.M4</div>
  <div class="match-card" style="left:350px;top:173px;opacity:0.5">Venc.O1 vs Venc.O2</div>
  <div class="match-card" style="left:510px;top:198px;opacity:0.5">Venc.Q1 vs Venc.Q2</div>
  <div class="match-card hero-match" style="left:670px;top:278px;text-align:center">🏆 FINAL<br><span style="font-size:9px;color:#fbbf24">19/07 · Nova York</span></div>
  <div class="match-card" style="left:665px;top:340px;opacity:0.5;border-style:dashed">3º Lugar</div>

  <!-- Side labels -->
  <div style="position:absolute;left:30px;top:10px;color:#60a5fa;font-size:10px">LADO ESQUERDO → SF-1</div>
</div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add prototypes/02-curved-lines.html
git commit -m "feat: protótipo 2 - conectores com curvas bezier"
```

---

### Task 3: Protótipo 3 — Tema escuro com cards polidos

**Files:**
- Create: `prototypes/03-dark-themed.html`

- [ ] **Step 1: Criar HTML com tema escuro e cards detalhados mostrando todos os estados**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Protótipo 3: Tema Escuro</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: #0f172a; color: #e2e8f0; font-family: system-ui; margin: 0; padding: 24px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px; margin: 6px 0; transition: all 0.2s; }
  .card:hover { border-color: #475569; }
  .card.agendado { }
  .card.finalizado .vencedor-row { background: #064e3b; margin: 0 -10px; padding: 4px 10px; }
  .card.tbd { opacity: 0.4; }
  .card.vivo { border-color: #ef4444; animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); } 50% { box-shadow: 0 0 0 4px rgba(239,68,68,0); } }
  .flag { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 2px; font-size: 14px; }
  .connector { position: absolute; border-color: #475569; }
  .connector.highlight { border-color: #10b981 !important; }
</style>
</head>
<body>
<h1 style="font-size:18px;margin-bottom:8px;color:#94a3b8">Protótipo 3 — Tema Escuro com Cards Polidos</h1>
<p style="font-size:12px;color:#64748b;margin-bottom:24px">Todos os estados de card: agendado, finalizado, pênaltis, ao vivo, a definir.</p>

<div style="display:flex;gap:24px;flex-wrap:wrap">
  <!-- Coluna: Estados de Card -->
  <div style="flex:1;min-width:280px">
    <h2 style="font-size:13px;color:#64748b;margin-bottom:12px">ESTADOS DO CARD</h2>

    <div style="margin-bottom:8px;font-size:10px;color:#475569">AGENDADO — times conhecidos</div>
    <div class="card agendado">
      <div style="font-size:9px;color:#64748b;margin-bottom:6px">29/06 · 13:00 · Los Angeles</div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">
        <span><span class="flag">🇧🇷</span> <span style="font-size:13px">Brasil</span></span>
        <span style="color:#64748b">—</span>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">
        <span><span class="flag">🇵🇹</span> <span style="font-size:13px">Portugal</span></span>
        <span style="color:#64748b">—</span>
      </div>
    </div>

    <div style="margin-bottom:8px;font-size:10px;color:#475569">FINALIZADO — vencedor destacado</div>
    <div class="card finalizado">
      <div style="font-size:9px;color:#64748b;margin-bottom:6px">FT · Los Angeles</div>
      <div class="vencedor-row">
        <span style="font-weight:600"><span class="flag">🇧🇷</span> Brasil</span>
        <span style="float:right;color:#10b981;font-weight:700;font-size:16px">3</span>
      </div>
      <div style="padding:3px 0">
        <span><span class="flag">🇵🇹</span> Portugal</span>
        <span style="float:right;color:#94a3b8">1</span>
      </div>
    </div>

    <div style="margin-bottom:8px;font-size:10px;color:#475569">FINALIZADO — pênaltis</div>
    <div class="card finalizado">
      <div style="font-size:9px;color:#64748b;margin-bottom:6px">FT · Dallas</div>
      <div style="padding:3px 0"><span><span class="flag">🇦🇷</span> Argentina</span><span style="float:right">2</span></div>
      <div class="vencedor-row">
        <span style="font-weight:600"><span class="flag">🇫🇷</span> França</span>
        <span style="float:right;font-weight:700;font-size:16px">2</span>
      </div>
      <div style="font-size:10px;color:#94a3b8;text-align:center">(4-3 pen)</div>
    </div>

    <div style="margin-bottom:8px;font-size:10px;color:#475569">AO VIVO</div>
    <div class="card vivo">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">
        <span style="width:6px;height:6px;background:#ef4444;border-radius:50%;display:inline-block"></span>
        <span style="color:#ef4444;font-size:10px;font-weight:600">AO VIVO · 67'</span>
      </div>
      <div style="padding:3px 0"><span><span class="flag">🇧🇷</span> Brasil</span><span style="float:right;font-weight:600">2</span></div>
      <div style="padding:3px 0"><span><span class="flag">🇵🇹</span> Portugal</span><span style="float:right">1</span></div>
    </div>

    <div style="margin-bottom:8px;font-size:10px;color:#475569">A DEFINIR</div>
    <div class="card tbd">
      <div style="font-size:9px;color:#64748b;margin-bottom:6px">30/06 · 18:00 · Seattle</div>
      <div style="color:#64748b;font-style:italic;padding:3px 0">1A vs 2B</div>
      <div style="color:#475569;font-size:9px">Grupo A (1º) vs Grupo B (2º)</div>
    </div>
  </div>

  <!-- Coluna: Mini bracket -->
  <div style="flex:2;min-width:500px;position:relative;height:400px">
    <h2 style="font-size:13px;color:#64748b;margin-bottom:12px">VISÃO PARCIAL DO BRACKET</h2>
    <svg style="position:absolute;top:0;left:0;width:100%;height:100%" viewBox="0 0 500 400">
      <!-- SF left to Final -->
      <line x1="250" y1="100" x2="250" y2="140" stroke="#475569" stroke-width="1"/>
      <line x1="250" y1="140" x2="310" y2="140" stroke="#475569" stroke-width="1"/>
      <line x1="310" y1="140" x2="310" y2="180" stroke="#475569" stroke-width="1"/>
      <line x1="380" y1="240" x2="310" y2="240" stroke="#475569" stroke-width="1"/>
      <line x1="310" y1="240" x2="310" y2="180" stroke="#475569" stroke-width="1"/>
      <!-- SF right to Final -->
      <line x1="250" y1="300" x2="250" y2="260" stroke="#475569" stroke-width="1"/>
      <line x1="250" y1="260" x2="310" y2="260" stroke="#475569" stroke-width="1"/>
      <line x1="310" y1="260" x2="310" y2="220" stroke="#475569" stroke-width="1"/>
      <line x1="380" y1="160" x2="310" y2="160" stroke="#475569" stroke-width="1"/>
      <line x1="310" y1="160" x2="310" y2="220" stroke="#475569" stroke-width="1"/>
      <!-- Semifinals to Final -->
      <line x1="310" y1="180" x2="310" y2="190" stroke="#475569" stroke-width="1"/>
      <line x1="310" y1="220" x2="310" y2="210" stroke="#475569" stroke-width="1"/>
      <line x1="310" y1="200" x2="250" y2="200" stroke="#475569" stroke-width="1"/>
      <!-- Final -->
      <rect x="200" y="188" width="50" height="24" rx="4" fill="#1e293b" stroke="#fbbf24" stroke-width="1.5"/>
      <text x="225" y="204" fill="#fbbf24" font-size="9" text-anchor="middle" font-weight="bold">FINAL</text>
      <!-- 3rd -->
      <rect x="200" y="248" width="50" height="22" rx="4" fill="#1e293b" stroke="#475569" stroke-width="1" stroke-dasharray="2,2"/>
      <text x="225" y="263" fill="#64748b" font-size="8" text-anchor="middle">3º lugar</text>

      <!-- Path highlight example (hover on Brasil shows green path) -->
      <text x="225" y="370" fill="#10b981" font-size="9" text-anchor="middle">Path highlight: hover no time → caminho verde</text>
    </svg>
    <div style="position:absolute;left:10px;top:80px" class="card" style="width:100px">
      <span class="flag">🇧🇷</span> Brasil<br><span style="color:#10b981">3 - 1</span> 🇵🇹
    </div>
    <div style="position:absolute;left:10px;top:260px" class="card" style="width:100px">
      <span class="flag">🇫🇷</span> França<br><span style="color:#10b981">2 - 1</span> 🏴󠁧󠁢󠁥󠁮󠁧󠁿
    </div>
    <div style="position:absolute;right:60px;top:140px" class="card" style="width:120px;opacity:0.5">
      Venc.SF1 vs Venc.QF2
    </div>
    <div style="position:absolute;right:60px;top:230px" class="card" style="width:120px;opacity:0.5">
      Venc.QF3 vs Venc.QF4
    </div>
  </div>
</div>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add prototypes/03-dark-themed.html
git commit -m "feat: protótipo 3 - tema escuro com cards polidos"
```

---

### Task 4: Protótipo 4 — Mobile swipe funcional

**Files:**
- Create: `prototypes/04-compact-mobile.html`

- [ ] **Step 1: Criar HTML com carrossel swipe para mobile**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Protótipo 4: Mobile Swipe</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: #0f172a; color: #e2e8f0; font-family: system-ui; margin: 0; padding: 16px; max-width: 420px; margin-inline: auto; }
  .carousel { overflow: hidden; position: relative; }
  .carousel-track { display: flex; transition: transform 0.3s ease; }
  .phase-panel { flex: 0 0 100%; padding: 0 4px; }
  .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; margin: 6px 0; }
  .card.done { border-color: #10b981; }
  .card.done .winner { background: #064e3b; margin: 0 -12px; padding: 4px 12px; }
  .card.pending { opacity: 0.5; }
  .dots { display: flex; justify-content: center; gap: 6px; margin: 16px 0; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #334155; transition: background 0.2s; }
  .dot.active { background: #3b82f6; }
  .side-label { font-size: 11px; font-weight: 600; margin: 12px 0 6px; padding: 4px 8px; border-radius: 4px; }
</style>
</head>
<body>
<h1 style="font-size:16px;margin-bottom:8px;color:#94a3b8">Protótipo 4 — Mobile Swipe</h1>
<p style="font-size:11px;color:#64748b;margin-bottom:16px">Deslize as setas ou clique nos dots para navegar entre fases</p>

<!-- Phase selector -->
<div style="display:flex;justify-content:center;gap:6px;margin-bottom:8px">
  <button onclick="goTo(0)" class="dot active" id="dot-0"></button>
  <button onclick="goTo(1)" class="dot" id="dot-1"></button>
  <button onclick="goTo(2)" class="dot" id="dot-2"></button>
  <button onclick="goTo(3)" class="dot" id="dot-3"></button>
  <button onclick="goTo(4)" class="dot" id="dot-4"></button>
  <button onclick="goTo(5)" class="dot" id="dot-5"></button>
</div>

<div style="text-align:center;margin-bottom:12px">
  <div style="color:#3b82f6;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:600" id="phase-title">16 avos de final</div>
  <div style="color:#64748b;font-size:10px" id="phase-sub">16 jogos · 32 seleções</div>
</div>

<div class="carousel" id="carousel">
  <div class="carousel-track" id="track" style="transform:translateX(0%)">
    <!-- Fase 1: 16 avos -->
    <div class="phase-panel">
      <div class="side-label" style="background:#1a2540;color:#60a5fa">LADO ESQUERDO → SF-1</div>

      <div class="card done">
        <div style="font-size:9px;color:#64748b;margin-bottom:6px">29/06 · 13:00 · Los Angeles</div>
        <div class="winner">
          <span class="flag">🇧🇷</span> Brasil
          <span style="float:right;color:#10b981;font-weight:700">3</span>
        </div>
        <div style="padding:3px 0"><span class="flag">🇵🇹</span> Portugal <span style="float:right">1</span></div>
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Oitavas J1</div>
      </div>

      <div class="card">
        <div style="font-size:9px;color:#64748b;margin-bottom:6px">29/06 · 18:00 · Kansas City</div>
        <div style="padding:3px 0"><span class="flag">🇦🇷</span> Argentina <span>—</span></div>
        <div style="padding:3px 0"><span class="flag">🇫🇷</span> França <span>—</span></div>
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Oitavas J1</div>
      </div>

      <div class="card pending">
        <div style="font-size:9px;color:#64748b;margin-bottom:6px">30/06 · 13:00 · Seattle</div>
        <div style="color:#64748b;font-style:italic">1C vs 2D</div>
        <div style="color:#475569;font-size:9px">Grupo C (1º) vs Grupo D (2º)</div>
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Oitavas J2</div>
      </div>

      <div class="side-label" style="background:#1a2540;color:#a78bfa">LADO DIREITO → SF-2</div>

      <div class="card done">
        <div style="font-size:9px;color:#64748b;margin-bottom:6px">30/06 · 18:00 · São Francisco</div>
        <div class="winner">
          <span class="flag">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span> Inglaterra
          <span style="float:right;color:#10b981;font-weight:700">2</span>
        </div>
        <div style="padding:3px 0"><span class="flag">🇩🇪</span> Alemanha <span style="float:right">0</span></div>
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Oitavas J5</div>
      </div>

      <div class="card pending">
        <div style="font-size:9px;color:#64748b;margin-bottom:6px">01/07 · 13:00 · Houston</div>
        <div style="color:#64748b;font-style:italic">1I vs 2J</div>
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Oitavas J5</div>
      </div>
    </div>

    <!-- Fase 2: Oitavas -->
    <div class="phase-panel">
      <div class="side-label" style="background:#1a2540;color:#60a5fa">LADO ESQUERDO</div>
      <div class="card">
        <div style="font-size:9px;color:#64748b;margin-bottom:6px">03/07 · 15:00 · Los Angeles</div>
        <div style="padding:3px 0"><span class="flag">🇧🇷</span> Brasil</div>
        <div style="padding:3px 0;color:#94a3b8;font-style:italic">vs Venc.R32</div>
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Quartas J1</div>
      </div>
      <div class="card pending">
        <div style="text-align:right;font-size:9px;color:#475569;margin-top:4px">→ Quartas J1</div>
      </div>
    </div>

    <!-- Fase 3-6: placeholders -->
    <div class="phase-panel"><div style="text-align:center;padding:40px;color:#64748b">Quartas de Final — 4 jogos<br><span style="font-size:11px">(cards similares)</span></div></div>
    <div class="phase-panel"><div style="text-align:center;padding:40px;color:#64748b">Semifinal — 2 jogos<br><span style="font-size:11px">(cards similares)</span></div></div>
    <div class="phase-panel"><div style="text-align:center;padding:40px;color:#fbbf24;font-size:18px;font-weight:700">🏆 FINAL</div></div>
    <div class="phase-panel"><div style="text-align:center;padding:40px;color:#64748b">3º Lugar</div></div>
  </div>
</div>

<div style="display:flex;justify-content:space-between;margin-top:12px">
  <button onclick="prev()" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px">← Anterior</button>
  <button onclick="next()" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 12px;border-radius:6px;font-size:12px">Próximo →</button>
</div>

<script>
  const phases = ['16 avos de final','Oitavas de final','Quartas de final','Semifinal','Final','3º Lugar'];
  const subs = ['16 jogos · 32 seleções','8 jogos · 16 seleções','4 jogos · 8 seleções','2 jogos · 4 seleções','1 jogo · campeão','1 jogo · bronze'];
  let current = 0;

  function goTo(i) {
    current = Math.max(0, Math.min(5, i));
    document.getElementById('track').style.transform = `translateX(-${current * 100}%)`;
    document.getElementById('phase-title').textContent = phases[current];
    document.getElementById('phase-sub').textContent = subs[current];
    for (let d = 0; d < 6; d++) document.getElementById(`dot-${d}`).classList.toggle('active', d === current);
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  // Touch swipe
  let startX = 0;
  document.getElementById('carousel').addEventListener('touchstart', e => { startX = e.touches[0].clientX; });
  document.getElementById('carousel').addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add prototypes/04-compact-mobile.html
git commit -m "feat: protótipo 4 - mobile swipe funcional"
```

---

### Task 5: Protótipo 5 — Animações e path highlighting

**Files:**
- Create: `prototypes/05-animated.html`

- [ ] **Step 1: Criar HTML com animações CSS e path highlighting interativo**

```html
<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Protótipo 5: Animações e Path Highlight</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>
  body { background: #0f172a; color: #e2e8f0; font-family: system-ui; margin: 0; padding: 24px; }
  .match { position: absolute; background: #1e293b; border: 1px solid #334155; border-radius: 6px; padding: 6px 10px; min-width: 110px; font-size: 11px; cursor: pointer; transition: all 0.2s; }
  .match:hover { border-color: #10b981; transform: scale(1.03); z-index: 10; }
  .match .team { padding: 2px 0; }
  .connector-line { transition: stroke 0.3s, stroke-width 0.3s; }
  .match[data-team="BRA"]:hover ~ svg .path-bra,
  .match:has(.brazil:hover) ~ svg .path-bra { stroke: #10b981 !important; stroke-width: 2 !important; }
</style>
</head>
<body>
<h1 style="font-size:18px;margin-bottom:8px;color:#94a3b8">Protótipo 5 — Animações e Path Highlighting</h1>
<p style="font-size:12px;color:#64748b;margin-bottom:20px">Passe o mouse sobre 🇧🇷 Brasil para ver o caminho até a Final. Clique num card para expandir.</p>

<div style="position:relative;width:800px;height:500px;margin:0 auto">
  <svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none">
    <!-- Default connectors -->
    <g class="connector-group">
      <!-- R32 pair 1 → Oit1 -->
      <line x1="130" y1="60" x2="150" y2="60" stroke="#475569" stroke-width="1" class="connector-line"/>
      <line x1="150" y1="60" x2="150" y2="100" stroke="#475569" stroke-width="1" class="connector-line"/>
      <line x1="130" y1="140" x2="150" y2="140" stroke="#475569" stroke-width="1" class="connector-line"/>
      <line x1="150" y1="140" x2="150" y2="100" stroke="#475569" stroke-width="1" class="connector-line"/>
      <line x1="150" y1="100" x2="170" y2="100" stroke="#475569" stroke-width="1" class="connector-line"/>

      <!-- Oit1 → QF1 -->
      <line x1="300" y1="100" x2="330" y2="100" stroke="#475569" stroke-width="1" class="connector-line"/>

      <!-- QF1 → SF1 -->
      <line x1="460" y1="100" x2="500" y2="100" stroke="#475569" stroke-width="1" class="connector-line"/>

      <!-- SF1 → Final -->
      <line x1="630" y1="100" x2="670" y2="200" stroke="#475569" stroke-width="1" class="connector-line path-bra"/>
    </g>

    <!-- Brasil path (highlighted on hover via JS) -->
    <g id="path-brasil" opacity="0">
      <line x1="130" y1="60" x2="150" y2="60" stroke="#10b981" stroke-width="2"/>
      <line x1="150" y1="60" x2="150" y2="100" stroke="#10b981" stroke-width="2"/>
      <line x1="150" y1="100" x2="170" y2="100" stroke="#10b981" stroke-width="2"/>
      <line x1="300" y1="100" x2="330" y2="100" stroke="#10b981" stroke-width="2"/>
      <line x1="460" y1="100" x2="500" y2="100" stroke="#10b981" stroke-width="2"/>
      <line x1="630" y1="100" x2="670" y2="200" stroke="#10b981" stroke-width="2"/>
    </g>
  </svg>

  <!-- Cards -->
  <div class="match" style="left:20px;top:45px" onmouseenter="highlightPath(true)" onmouseleave="highlightPath(false)">
    <div class="team" style="background:#064e3b;margin:0 -10px;padding:2px 10px">
      🇧🇷 <b>Brasil</b> <span style="float:right;color:#10b981;font-weight:700">3</span>
    </div>
    <div class="team">🇵🇹 Portugal <span style="float:right">1</span></div>
    <div style="font-size:9px;color:#64748b;margin-top:3px">FT · Los Angeles</div>
  </div>
  <div class="match" style="left:20px;top:125px;opacity:0.6">
    <div class="team">🇦🇷 Argentina <span>—</span></div>
    <div class="team">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra <span>—</span></div>
  </div>
  <div class="match" style="left:170px;top:88px;opacity:0.5">
    <div style="color:#64748b;font-style:italic">Venc.M1 vs Venc.M2</div>
  </div>
  <div class="match" style="left:335px;top:88px;opacity:0.5">
    <div style="color:#64748b;font-style:italic">Venc.O1 vs Venc.O2</div>
  </div>
  <div class="match" style="left:505px;top:88px;opacity:0.5">
    <div style="color:#64748b;font-style:italic">Venc.Q1 vs Venc.Q2</div>
  </div>
  <div class="match" style="left:650px;top:188px;border-color:#fbbf24;background:#1a2a1a">
    <div style="text-align:center;color:#fbbf24;font-weight:700">🏆 FINAL</div>
    <div style="font-size:9px;color:#64748b;text-align:center">19/07 · Nova York</div>
  </div>

  <!-- Click indicator -->
  <div style="position:absolute;left:200px;top:400px;font-size:10px;color:#64748b;text-align:center;width:400px">
    Hover sobre o card do Brasil → caminho verde aparece com animação (opacity transition 0.3s)
  </div>
</div>

<script>
  function highlightPath(show) {
    document.getElementById('path-brasil').style.opacity = show ? '1' : '0';
    document.getElementById('path-brasil').style.transition = 'opacity 0.3s';
  }
</script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add prototypes/05-animated.html
git commit -m "feat: protótipo 5 - animações e path highlighting"
```

---

### Task 6: Função utilitária getLadoSlot

**Files:**
- Create: `src/components/public/bracket-lado-utils.ts`

- [ ] **Step 1: Criar utilitário que determina qual lado (SF-1 ou SF-2) cada slot R32 pertence**

```typescript
/**
 * Derivado dos pareamentos reais do projector:
 *   PAREAMENTO_R32_PARA_R16 = [[2,5],[1,3],[4,6],[7,8],[11,12],[9,10],[14,16],[13,15]]
 *   PAREAMENTO_R16_PARA_QF = [[1,2],[5,6],[3,4],[7,8]]
 *   QF → SF: [[1,2],[3,4]]
 *
 * SF-1 = QF [1,2] = Oit [1,2] + Oit [5,6] → R32 {1,2,3,5,9,10,11,12}
 * SF-2 = QF [3,4] = Oit [3,4] + Oit [7,8] → R32 {4,6,7,8,13,14,15,16}
 */

const R32_SF1_SLOTS = new Set([1, 2, 3, 5, 9, 10, 11, 12])
const R32_SF2_SLOTS = new Set([4, 6, 7, 8, 13, 14, 15, 16])

export type Lado = 'left' | 'right'

export function getLadoSlot(r32Slot: number): Lado {
  if (R32_SF1_SLOTS.has(r32Slot)) return 'left'
  if (R32_SF2_SLOTS.has(r32Slot)) return 'right'
  throw new Error(`R32 slot ${r32Slot} não pertence a nenhum lado`)
}

/**
 * Agrupa R32 slots por lado, mantendo ordem cronológica (slot ascendente)
 */
export function groupR32BySide<T extends { slot: number }>(slots: T[]): { left: T[]; right: T[] } {
  const left: T[] = []
  const right: T[] = []
  for (const s of slots) {
    if (R32_SF1_SLOTS.has(s.slot)) left.push(s)
    else if (R32_SF2_SLOTS.has(s.slot)) right.push(s)
  }
  return { left, right }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/public/bracket-lado-utils.ts
git commit -m "feat: utilitário getLadoSlot para agrupar slots por lado SF"
```

---

### Task 7: BracketMatchCard — novo card de confronto

**Files:**
- Create: `src/components/public/bracket-match-card.tsx`
- Create: `src/components/public/__tests__/bracket-match-card.test.tsx`

- [ ] **Step 1: Escrever o teste**

```typescript
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { BracketMatchCard } from '../bracket-match-card'
import type { BracketSlot } from '@/lib/services/bracket/types'

const baseSlot: BracketSlot = {
  jogoId: 'j1', fase: 'dezesseis_avos', slot: 1,
  timeA: null, timeB: null, placarA: null, placarB: null,
  placarPenaltisA: null, placarPenaltisB: null,
  status: 'agendado', vencedor: null, dataHora: null,
}

describe('BracketMatchCard', () => {
  it('renderiza times e scores quando finalizado', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, status: 'finalizado', vencedor: 'A' }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText('Brasil')).toBeInTheDocument()
    expect(screen.getByText('Portugal')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('vencedor tem background verde', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, status: 'finalizado', vencedor: 'A' }
    const { container } = render(<BracketMatchCard slot={slot} />)
    expect(container.querySelector('.bg-emerald-950\\/40')).toBeInTheDocument()
  })

  it('mostra "A definir" quando times são null', () => {
    render(<BracketMatchCard slot={baseSlot} />)
    expect(screen.getAllByText('A definir').length).toBe(2)
  })

  it('mostra pênaltis quando placar igual e há penaltis', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Argentina', timeB: 'França', placarA: 2, placarB: 2, placarPenaltisA: 4, placarPenaltisB: 3, status: 'finalizado', vencedor: 'A' }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText(/4-3 pen/)).toBeInTheDocument()
  })

  it('mostra badge AO VIVO quando em_andamento', () => {
    const slot: BracketSlot = { ...baseSlot, timeA: 'Brasil', timeB: 'Portugal', placarA: 2, placarB: 1, status: 'em_andamento', vencedor: null }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText('AO VIVO')).toBeInTheDocument()
  })

  it('mostra placeholder fonte (1A vs 2B) quando sourceGrupo definido', () => {
    const slot: BracketSlot = {
      ...baseSlot,
      timeA: null, timeB: null,
      sourceGrupo: {
        timeA: { grupo: 'A', posicao: 1 },
        timeB: { grupo: 'B', posicao: 2 },
      },
    }
    render(<BracketMatchCard slot={slot} />)
    expect(screen.getByText('1A vs 2B')).toBeInTheDocument()
  })

  it('aplica classe tbd (opacity reduzida) quando ambos times null', () => {
    const { container } = render(<BracketMatchCard slot={baseSlot} />)
    expect(container.querySelector('.opacity-40')).toBeInTheDocument()
  })

  it('renderiza data/hora formatada', () => {
    const data = new Date('2026-07-14T20:00:00Z')
    const slot: BracketSlot = { ...baseSlot, dataHora: data }
    render(<BracketMatchCard slot={slot} />)
    // Data em BRT: 14/07
    expect(screen.getByText(/14\/07/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste para ver que falha**

```bash
npm test -- --testPathPattern="bracket-match-card" 2>&1 | tail -20
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implementar BracketMatchCard**

```typescript
import type { BracketSlot } from '@/lib/services/bracket/types'
import { Flag } from '@/components/ui/flag'
import { getTimeFlag } from '@/lib/utils/flags'
import { formatarData, formatarHora } from '@/lib/utils/date'
import { cn } from '@/lib/utils'

type Props = {
  slot: BracketSlot
  size?: 'sm' | 'md'
  href?: string
}

const SIZE_CLASSES = {
  sm: 'text-[11px] p-2 min-w-[110px]',
  md: 'text-[12px] p-2.5 min-w-[130px]',
}

export function BracketMatchCard({ slot, size = 'md', href }: Props) {
  const isFinalizado = slot.status === 'finalizado'
  const isLive = slot.status === 'em_andamento'
  const isTBD = slot.timeA === null && slot.timeB === null
  const comPenaltes = isFinalizado
    && slot.placarA === slot.placarB
    && slot.placarPenaltisA !== null
    && slot.placarPenaltisB !== null

  const timeA = slot.timeA ?? formatSource(slot.sourceGrupo, 'timeA') ?? 'A definir'
  const timeB = slot.timeB ?? formatSource(slot.sourceGrupo, 'timeB') ?? 'A definir'
  const italicA = !!(!slot.timeA && formatSource(slot.sourceGrupo, 'timeA'))
  const italicB = !!(!slot.timeB && formatSource(slot.sourceGrupo, 'timeB'))
  const isWinnerA = isFinalizado && slot.vencedor === 'A'
  const isWinnerB = isFinalizado && slot.vencedor === 'B'

  const dataHoraTexto = slot.dataHora
    ? `${formatarData(slot.dataHora)} · ${formatarHora(slot.dataHora)}`
    : null

  const CardTag = href ? 'a' : 'div'
  const cardProps = href ? { href } : {}

  return (
    <CardTag
      {...cardProps}
      className={cn(
        'block bg-card border rounded-md transition-all duration-200',
        SIZE_CLASSES[size],
        isTBD && 'opacity-40',
        isLive && 'border-red-500/50',
        href && 'hover:bg-muted/50 cursor-pointer',
      )}
    >
      {/* Header: date or LIVE badge */}
      {isLive ? (
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          <span className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">AO VIVO</span>
        </div>
      ) : dataHoraTexto ? (
        <div className="text-[10px] text-muted-foreground mb-1.5">{dataHoraTexto}</div>
      ) : null}

      {/* Team A */}
      <div className={cn(
        'flex items-center justify-between gap-2 py-0.5',
        isWinnerA && 'bg-emerald-950/40 -mx-2.5 px-2.5 rounded',
      )}>
        <span className={cn(
          'truncate flex items-center gap-1.5',
          italicA && 'italic text-muted-foreground',
          isWinnerA && 'font-bold text-emerald-300',
        )}>
          {slot.timeA && getTimeFlag(slot.timeA) && <Flag codigoIso={getTimeFlag(slot.timeA)!} size={14} />}
          <span className="truncate">{timeA}</span>
        </span>
        <span className={cn(
          'tabular-nums font-mono',
          isWinnerA ? 'font-bold text-emerald-300' : 'text-muted-foreground',
        )}>{slot.placarA ?? '—'}</span>
      </div>

      {/* Team B */}
      <div className={cn(
        'flex items-center justify-between gap-2 py-0.5 mt-0.5',
        isWinnerB && 'bg-emerald-950/40 -mx-2.5 px-2.5 rounded',
      )}>
        <span className={cn(
          'truncate flex items-center gap-1.5',
          italicB && 'italic text-muted-foreground',
          isWinnerB && 'font-bold text-emerald-300',
        )}>
          {slot.timeB && getTimeFlag(slot.timeB) && <Flag codigoIso={getTimeFlag(slot.timeB)!} size={14} />}
          <span className="truncate">{timeB}</span>
        </span>
        <span className={cn(
          'tabular-nums font-mono',
          isWinnerB ? 'font-bold text-emerald-300' : 'text-muted-foreground',
        )}>{slot.placarB ?? '—'}</span>
      </div>

      {/* Penalties */}
      {comPenaltes && (
        <div className="text-[10px] text-muted-foreground mt-1 text-center">
          ({slot.placarPenaltisA}-{slot.placarPenaltisB} pen)
        </div>
      )}

      {/* Footer: cidade */}
      {slot.dataHora && isFinalizado && (
        <div className="text-[9px] text-muted-foreground mt-1.5 border-t pt-1 border-border/30">
          FT
        </div>
      )}
    </CardTag>
  )
}

function formatSource(
  source: BracketSlot['sourceGrupo'],
  lado: 'timeA' | 'timeB',
): string | null {
  if (!source) return null
  const info = source[lado]
  if (!info) return null
  return `${info.posicao}${info.grupo}`
}
```

- [ ] **Step 4: Rodar teste para ver que passa**

```bash
npm test -- --testPathPattern="bracket-match-card" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/bracket-match-card.tsx src/components/public/__tests__/bracket-match-card.test.tsx
git commit -m "feat: BracketMatchCard substituindo BracketMatch"
```

---

### Task 8: BracketConnectors — SVG overlay de conectores

**Files:**
- Create: `src/components/public/bracket-connectors.tsx`

- [ ] **Step 1: Implementar componente SVG com linhas de conexão entre fases**

```typescript
type ConnectorPath = {
  x1: number; y1: number; x2: number; y2: number; type: 'h' | 'v'
}

type Props = {
  paths: ConnectorPath[]
  highlightedPathIds?: Set<number>
  width: number
  height: number
}

/**
 * Renderiza sobreposição SVG com linhas de conexão.
 * Cada ConnectorPath define um segmento de linha horizontal ou vertical.
 * highlightedPathIds pinta linhas específicas de verde.
 */
export function BracketConnectors({ paths, highlightedPathIds, width, height }: Props) {
  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {paths.map((p, i) => {
        const isHighlighted = highlightedPathIds?.has(i)
        return (
          <line
            key={i}
            x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
            stroke={isHighlighted ? '#10b981' : '#475569'}
            strokeWidth={isHighlighted ? 1.5 : 1}
            className="transition-all duration-300"
          />
        )
      })}
    </svg>
  )
}

/**
 * Gera os segmentos de conexão para um lado do bracket.
 * Layout: cada card tem altura fixa H, gap G entre cards.
 */
export function computeSideConnectors(
  r32Count: number,
  cardH: number,
  gap: number,
  colWidth: number,
  startX: number,
  direction: 'left' | 'right',
): ConnectorPath[] {
  const paths: ConnectorPath[] = []
  const colGap = 24 // gap entre colunas

  // R32 column X coordinate
  const r32X = direction === 'right' ? startX + colWidth : startX
  const connStartX = direction === 'right' ? r32X : r32X + colWidth

  // For each pair of R32 matches → 1 Oitavas match
  for (let i = 0; i < r32Count; i += 2) {
    const topCardCenter = i * (cardH + gap) + cardH / 2
    const bottomCardCenter = (i + 1) * (cardH + gap) + cardH / 2
    const midY = (topCardCenter + bottomCardCenter) / 2

    // Horizontal from top card to connector column
    paths.push({ x1: connStartX, y1: topCardCenter, x2: connStartX + colGap / 2, y2: topCardCenter, type: 'h' })
    // Vertical joining top and bottom
    paths.push({ x1: connStartX + colGap / 2, y1: topCardCenter, x2: connStartX + colGap / 2, y2: bottomCardCenter, type: 'v' })
    // Horizontal from bottom card to connector column
    paths.push({ x1: connStartX, y1: bottomCardCenter, x2: connStartX + colGap / 2, y2: bottomCardCenter, type: 'h' })
    // Horizontal from mid to next column
    const nextX = direction === 'left' ? connStartX + colGap : connStartX - colGap
    paths.push({ x1: connStartX + colGap / 2, y1: midY, x2: connStartX + colGap, y2: midY, type: 'h' })
  }

  return paths
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/public/bracket-connectors.tsx
git commit -m "feat: BracketConnectors SVG overlay"
```

---

### Task 9: BracketSide — um lado do bracket

**Files:**
- Create: `src/components/public/bracket-side.tsx`

- [ ] **Step 1: Implementar componente que renderiza um lado (esquerdo ou direito)**

```typescript
'use client'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'
import { cn } from '@/lib/utils'

type Props = {
  side: 'left' | 'right'
  /** Slots R32 + Oitavas + QF + SF deste lado */
  slots: BracketSlot[]
  highlightedTeam?: string | null
  onTeamHover?: (team: string | null) => void
}

const SIDE_COLORS = {
  left: { bg: 'bg-blue-950/30', text: 'text-blue-400', label: 'SF-1 ←' },
  right: { bg: 'bg-purple-950/30', text: 'text-purple-400', label: '→ SF-2' },
} as const

const FASE_LABELS: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 AVOS',
  oitavas: 'OITAVAS',
  quartas: 'QUARTAS',
  semifinal: 'SEMI',
  terceiro: '3º',
  final: 'FINAL',
}

export function BracketSide({ side, slots, highlightedTeam, onTeamHover }: Props) {
  const colors = SIDE_COLORS[side]
  const grouped = groupByFase(slots)

  return (
    <div className={cn('rounded-lg p-3 flex-1 min-w-0', colors.bg)}>
      <div className={cn('text-xs font-semibold mb-3 text-center', colors.text)}>
        {side === 'left' ? 'LADO ESQUERDO' : 'LADO DIREITO'}
      </div>

      <div className="flex gap-2">
        {(Object.keys(grouped) as BracketSlot['fase'][]).filter(f => f !== 'final' && f !== 'terceiro').map(fase => (
          <div key={fase} className="flex-1 min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider text-center mb-1">
              {FASE_LABELS[fase]}
            </div>
            <div className="space-y-1">
              {grouped[fase].map(slot => (
                <BracketMatchCard
                  key={slot.jogoId}
                  slot={slot}
                  size="sm"
                  href={`/jogos/${slot.jogoId}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function groupByFase(slots: BracketSlot[]): Record<string, BracketSlot[]> {
  const g: Record<string, BracketSlot[]> = {}
  for (const s of slots) {
    (g[s.fase] ??= []).push(s)
  }
  // Sort within each fase by slot number
  for (const fase of Object.keys(g)) {
    g[fase].sort((a, b) => a.slot - b.slot)
  }
  return g
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/public/bracket-side.tsx
git commit -m "feat: BracketSide componente de um lado do bracket"
```

---

### Task 10: BracketCenter — Final e 3º lugar

**Files:**
- Create: `src/components/public/bracket-center.tsx`

- [ ] **Step 1: Implementar coluna central com Final e 3º lugar**

```typescript
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'

type Props = {
  final: BracketSlot | null
  terceiro: BracketSlot | null
}

export function BracketCenter({ final, terceiro }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 px-3 min-w-[140px]">
      {/* Final */}
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">FINAL</div>
        <div className="relative">
          {final ? (
            <BracketMatchCard
              slot={final}
              size="md"
              href={`/jogos/${final.jogoId}`}
            />
          ) : (
            <div className="bg-card border border-amber-500/50 rounded-md p-3 min-w-[130px] text-center">
              <div className="text-amber-400 font-bold text-sm">🏆 FINAL</div>
              <div className="text-[10px] text-muted-foreground mt-1">A definir</div>
            </div>
          )}
        </div>
      </div>

      {/* Connector: dashed line */}
      <div className="w-0.5 h-6 bg-border/50" style={{ borderLeft: '2px dashed #475569' }} />

      {/* 3rd place */}
      <div className="text-center">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">3º LUGAR</div>
        {terceiro ? (
          <BracketMatchCard
            slot={terceiro}
            size="sm"
            href={`/jogos/${terceiro.jogoId}`}
          />
        ) : (
          <div className="bg-card border border-border rounded-md p-2.5 min-w-[130px] text-center opacity-50">
            <div className="text-[11px] text-muted-foreground">3º Lugar</div>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/public/bracket-center.tsx
git commit -m "feat: BracketCenter com Final e 3º lugar"
```

---

### Task 11: BracketPhaseDots — indicador de fase mobile

**Files:**
- Create: `src/components/public/bracket-phase-dots.tsx`

- [ ] **Step 1: Implementar dots com clique para selecionar fase**

```typescript
'use client'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { cn } from '@/lib/utils'

const FASES: BracketSlot['fase'][] = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'final', 'terceiro']

const FASE_LABELS_SHORT: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: 'R32',
  oitavas: 'Oit.',
  quartas: 'QF',
  semifinal: 'Semi',
  terceiro: '3º',
  final: 'Final',
}

type Props = {
  faseAtiva: BracketSlot['fase']
  onSelect: (fase: BracketSlot['fase']) => void
}

export function BracketPhaseDots({ faseAtiva, onSelect }: Props) {
  return (
    <div className="flex justify-center gap-1.5 py-2">
      {FASES.map(f => (
        <button
          key={f}
          onClick={() => onSelect(f)}
          aria-label={FASE_LABELS_SHORT[f]}
          aria-current={faseAtiva === f ? 'page' : undefined}
          className={cn(
            'w-2 h-2 rounded-full transition-all duration-200',
            faseAtiva === f
              ? 'bg-primary w-5'
              : 'bg-border hover:bg-muted-foreground/50',
          )}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/public/bracket-phase-dots.tsx
git commit -m "feat: BracketPhaseDots indicador de fase mobile"
```

---

### Task 12: BracketMobile — carrossel swipe de fases

**Files:**
- Create: `src/components/public/bracket-mobile.tsx`
- Create: `src/components/public/__tests__/bracket-mobile.test.tsx`

- [ ] **Step 1: Escrever teste para BracketMobile**

```typescript
/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { BracketMobile } from '../bracket-mobile'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slots: BracketSlot[] = [
  { jogoId: 'r1', fase: 'dezesseis_avos', slot: 1, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, placarPenaltisA: null, placarPenaltisB: null, status: 'finalizado', vencedor: 'A', dataHora: null },
  { jogoId: 'r2', fase: 'oitavas', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
]

describe('BracketMobile', () => {
  it('renderiza o título da fase ativa', () => {
    render(<BracketMobile slots={slots} />)
    expect(screen.getByText('16 avos de final')).toBeInTheDocument()
  })

  it('renderiza dots de navegação', () => {
    const { container } = render(<BracketMobile slots={slots} />)
    const dots = container.querySelectorAll('[aria-label]')
    expect(dots.length).toBeGreaterThanOrEqual(6)
  })

  it('muda de fase ao clicar em dot', () => {
    const { container } = render(<BracketMobile slots={slots} />)
    const dots = container.querySelectorAll('[aria-label]')
    fireEvent.click(dots[1]) // Oitavas
    expect(screen.getByText('Oitavas de final')).toBeInTheDocument()
  })

  it('destaca fase ativa (aria-current="page")', () => {
    const { container } = render(<BracketMobile slots={slots} />)
    const activeDot = container.querySelector('[aria-current="page"]')
    expect(activeDot).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar teste para ver que falha**

```bash
npm test -- --testPathPattern="bracket-mobile" 2>&1 | tail -20
```

Expected: FAIL.

- [ ] **Step 3: Implementar BracketMobile**

```typescript
'use client'
import { useState, useRef, useEffect, useCallback } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketMatchCard } from './bracket-match-card'
import { BracketPhaseDots } from './bracket-phase-dots'
import { groupR32BySide } from './bracket-lado-utils'
import { cn } from '@/lib/utils'

type Props = {
  slots: BracketSlot[]
}

const FASES: BracketSlot['fase'][] = ['dezesseis_avos', 'oitavas', 'quartas', 'semifinal', 'final', 'terceiro']

const FASE_LABELS: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 avos de final',
  oitavas: 'Oitavas de final',
  quartas: 'Quartas de final',
  semifinal: 'Semifinal',
  terceiro: '3º Lugar',
  final: 'Final',
}

const FASE_SUBTITLES: Record<BracketSlot['fase'], string> = {
  dezesseis_avos: '16 jogos · 32 seleções',
  oitavas: '8 jogos · 16 seleções',
  quartas: '4 jogos · 8 seleções',
  semifinal: '2 jogos · 4 seleções',
  terceiro: 'Disputa do bronze',
  final: 'A grande final',
}

const SIDE_COLORS = {
  left: { bg: 'bg-blue-950/30', border: 'border-blue-500/20', text: 'text-blue-400' },
  right: { bg: 'bg-purple-950/30', border: 'border-purple-500/20', text: 'text-purple-400' },
} as const

export function BracketMobile({ slots }: Props) {
  const [faseAtiva, setFaseAtiva] = useState<BracketSlot['fase']>('dezesseis_avos')
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)

  const slotsPorFase = useCallback((fase: BracketSlot['fase']) =>
    slots.filter(s => s.fase === fase).sort((a, b) => a.slot - b.slot),
  [])

  const faseIndex = FASES.indexOf(faseAtiva)

  const goTo = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(FASES.length - 1, index))
    setFaseAtiva(FASES[clamped])
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? faseIndex + 1 : faseIndex - 1)
    }
  }

  const currentSlots = slotsPorFase(faseAtiva)

  // For R32, group by side
  const useSideGroups = faseAtiva === 'dezesseis_avos'
  const { left, right } = useSideGroups ? groupR32BySide(currentSlots) : { left: [], right: [] }

  return (
    <div className="lg:hidden">
      <BracketPhaseDots faseAtiva={faseAtiva} onSelect={setFaseAtiva} />

      <div className="text-center mb-3">
        <div className="text-sm font-semibold text-foreground">{FASE_LABELS[faseAtiva]}</div>
        <div className="text-[11px] text-muted-foreground">{FASE_SUBTITLES[faseAtiva]}</div>
      </div>

      <div
        className="overflow-hidden touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        ref={trackRef}
      >
        {useSideGroups ? (
          <div className="space-y-4">
            {/* Left side */}
            {left.length > 0 && (
              <div className={cn('rounded-lg p-3', SIDE_COLORS.left.bg, SIDE_COLORS.left.border, 'border')}>
                <div className={cn('text-[11px] font-semibold mb-2', SIDE_COLORS.left.text)}>
                  LADO ESQUERDO → SF-1
                </div>
                <div className="space-y-1.5">
                  {left.map(slot => (
                    <BracketMatchCard key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
                  ))}
                </div>
              </div>
            )}

            {/* Right side */}
            {right.length > 0 && (
              <div className={cn('rounded-lg p-3', SIDE_COLORS.right.bg, SIDE_COLORS.right.border, 'border')}>
                <div className={cn('text-[11px] font-semibold mb-2', SIDE_COLORS.right.text)}>
                  LADO DIREITO → SF-2
                </div>
                <div className="space-y-1.5">
                  {right.map(slot => (
                    <BracketMatchCard key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            {currentSlots.map(slot => (
              <BracketMatchCard key={slot.jogoId} slot={slot} size="sm" href={`/jogos/${slot.jogoId}`} />
            ))}
          </div>
        )}
      </div>

      {/* Swipe hint */}
      <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground">
        <button onClick={() => goTo(faseIndex - 1)} className="hover:text-foreground transition-colors" aria-label="Fase anterior">
          ← Anterior
        </button>
        <span>Arraste para navegar</span>
        <button onClick={() => goTo(faseIndex + 1)} className="hover:text-foreground transition-colors" aria-label="Próxima fase">
          Próximo →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rodar teste para ver que passa**

```bash
npm test -- --testPathPattern="bracket-mobile" 2>&1 | tail -20
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/bracket-mobile.tsx src/components/public/__tests__/bracket-mobile.test.tsx
git commit -m "feat: BracketMobile carrossel swipe de fases"
```

---

### Task 13: BracketTwoSided — layout desktop dois lados

**Files:**
- Create: `src/components/public/bracket-two-sided.tsx`

- [ ] **Step 1: Implementar container desktop com dois lados + centro**

```typescript
'use client'
import { useState, useMemo } from 'react'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketSide } from './bracket-side'
import { BracketCenter } from './bracket-center'
import { groupR32BySide } from './bracket-lado-utils'

type Props = {
  slots: BracketSlot[]
}

/**
 * Divide todos os slots por lado (esquerdo/direito) baseado no SF para onde
 * os R32 slots alimentam. Slots de fases posteriores são atribuídos por
 * rastreamento dos pareamentos do projector.
 */
export function BracketTwoSided({ slots }: Props) {
  const [highlightedTeam, setHighlightedTeam] = useState<string | null>(null)

  const { leftSlots, rightSlots, finalSlot, terceiroSlot } = useMemo(() => {
    const final = slots.find(s => s.fase === 'final') ?? null
    const terceiro = slots.find(s => s.fase === 'terceiro') ?? null

    const r32 = slots.filter(s => s.fase === 'dezesseis_avos')
    const { left: r32Left, right: r32Right } = groupR32BySide(r32)

    // Oitavas: 5-8 = SF-1 side (left), 1-4 + 5-8 split
    const oitavas = slots.filter(s => s.fase === 'oitavas')
    // Oit 1,2,5,6 → SF-1 (left); Oit 3,4,7,8 → SF-2 (right)
    const oitLeft = oitavas.filter(s => [1, 2, 5, 6].includes(s.slot))
    const oitRight = oitavas.filter(s => [3, 4, 7, 8].includes(s.slot))

    // Quartas: QF 1,2 → SF-1 (left); QF 3,4 → SF-2 (right)
    const quartas = slots.filter(s => s.fase === 'quartas')
    const qfLeft = quartas.filter(s => [1, 2].includes(s.slot))
    const qfRight = quartas.filter(s => [3, 4].includes(s.slot))

    // Semis: SF 1 → left, SF 2 → right
    const semis = slots.filter(s => s.fase === 'semifinal')
    const sfLeft = semis.filter(s => s.slot === 1)
    const sfRight = semis.filter(s => s.slot === 2)

    return {
      leftSlots: [...r32Left, ...oitLeft, ...qfLeft, ...sfLeft],
      rightSlots: [...r32Right, ...oitRight, ...qfRight, ...sfRight],
      finalSlot: final,
      terceiroSlot: terceiro,
    }
  }, [slots])

  return (
    <div className="hidden lg:block">
      <div className="overflow-x-auto">
        <div className="flex items-start gap-4 min-w-[900px] justify-center px-4 py-2">
          <BracketSide
            side="left"
            slots={leftSlots}
            highlightedTeam={highlightedTeam}
            onTeamHover={setHighlightedTeam}
          />
          <BracketCenter final={finalSlot} terceiro={terceiroSlot} />
          <BracketSide
            side="right"
            slots={rightSlots}
            highlightedTeam={highlightedTeam}
            onTeamHover={setHighlightedTeam}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/public/bracket-two-sided.tsx
git commit -m "feat: BracketTwoSided layout desktop dois lados"
```

---

### Task 14: Refatorar bracket.tsx para usar novos componentes

**Files:**
- Modify: `src/components/public/bracket.tsx`
- Modify: `src/components/public/__tests__/bracket.test.tsx`

- [ ] **Step 1: Reescrever bracket.tsx**

```typescript
'use client'
import type { BracketSlot } from '@/lib/services/bracket/types'
import { BracketTwoSided } from './bracket-two-sided'
import { BracketMobile } from './bracket-mobile'

type Props = {
  slots: BracketSlot[]
}

export function Bracket({ slots }: Props) {
  return (
    <div>
      <BracketMobile slots={slots} />
      <BracketTwoSided slots={slots} />
    </div>
  )
}
```

- [ ] **Step 2: Atualizar testes de bracket.test.tsx**

```typescript
/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react'
import { Bracket } from '../bracket'
import type { BracketSlot } from '@/lib/services/bracket/types'

const slots: BracketSlot[] = [
  { jogoId: 'r32-1', fase: 'dezesseis_avos', slot: 1, timeA: 'Brasil', timeB: 'Portugal', placarA: 3, placarB: 1, placarPenaltisA: null, placarPenaltisB: null, status: 'finalizado', vencedor: 'A', dataHora: null },
  { jogoId: 'r32-2', fase: 'dezesseis_avos', slot: 2, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-3', fase: 'dezesseis_avos', slot: 3, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-4', fase: 'dezesseis_avos', slot: 4, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-5', fase: 'dezesseis_avos', slot: 5, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-6', fase: 'dezesseis_avos', slot: 6, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-7', fase: 'dezesseis_avos', slot: 7, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-8', fase: 'dezesseis_avos', slot: 8, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-9', fase: 'dezesseis_avos', slot: 9, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-10', fase: 'dezesseis_avos', slot: 10, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-11', fase: 'dezesseis_avos', slot: 11, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-12', fase: 'dezesseis_avos', slot: 12, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-13', fase: 'dezesseis_avos', slot: 13, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-14', fase: 'dezesseis_avos', slot: 14, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-15', fase: 'dezesseis_avos', slot: 15, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r32-16', fase: 'dezesseis_avos', slot: 16, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'r16-1', fase: 'oitavas', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'qf-1', fase: 'quartas', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'sf-1', fase: 'semifinal', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 'f-1', fase: 'final', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
  { jogoId: 't-1', fase: 'terceiro', slot: 1, timeA: null, timeB: null, placarA: null, placarB: null, placarPenaltisA: null, placarPenaltisB: null, status: 'agendado', vencedor: null, dataHora: null },
]

describe('Bracket', () => {
  it('renderiza sem erros', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getByText('Brasil')).toBeInTheDocument()
  })

  it('renderiza lado esquerdo e direito', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getByText('LADO ESQUERDO')).toBeInTheDocument()
    expect(screen.getByText('LADO DIREITO')).toBeInTheDocument()
  })

  it('renderiza Final e 3º lugar no centro', () => {
    render(<Bracket slots={slots} />)
    expect(screen.getByText('🏆 FINAL')).toBeInTheDocument()
    expect(screen.getByText('3º LUGAR')).toBeInTheDocument()
  })
})

describe('Bracket mobile', () => {
  it('renderiza dots de navegação no mobile', () => {
    const { container } = render(<Bracket slots={slots} />)
    const dots = container.querySelectorAll('[aria-label]')
    expect(dots.length).toBeGreaterThanOrEqual(6)
  })

  it('destaca fase ativa com aria-current', () => {
    const { container } = render(<Bracket slots={slots} />)
    const active = container.querySelector('[aria-current="page"]')
    expect(active).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Rodar testes**

```bash
npm test -- --testPathPattern="bracket" 2>&1 | tail -30
```

Expected: PASS.

- [ ] **Step 4: Verificar que build compila**

```bash
npx tsc --noEmit --pretty 2>&1 | head -40
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/public/bracket.tsx src/components/public/__tests__/bracket.test.tsx
git commit -m "refactor: bracket.tsx usa BracketTwoSided + BracketMobile"
```

---

### Task 15: Remover componentes antigos e adaptar simulator-tab

**Files:**
- Remove: `src/components/public/bracket-grid.tsx`
- Remove: `src/components/public/bracket-column.tsx`
- Remove: `src/components/public/bracket-match.tsx`
- Remove: `src/components/public/__tests__/bracket-match.test.tsx`
- Modify: `src/components/public/simulator-tab.tsx`

- [ ] **Step 1: Verificar que bracket-match.tsx não é mais importado**

```bash
grep -r "bracket-match" src/ --include="*.ts" --include="*.tsx" | grep -v ".test." | grep -v bracket-match-card
```

Expected: no results (only bracket-match-card imports remain).

- [ ] **Step 2: Verificar que bracket-grid e bracket-column não são mais importados**

```bash
grep -r "bracket-grid\|bracket-column" src/ --include="*.ts" --include="*.tsx" | grep -v test
```

Expected: no results (only in bracket.tsx which now uses new components).

- [ ] **Step 3: Verificar simulator-tab — import do Bracket permanece igual**

```bash
grep "import.*Bracket" src/components/public/simulator-tab.tsx
```

Expected: `import { Bracket } from './bracket'` — sem mudanças necessárias pois a interface do componente não mudou.

- [ ] **Step 4: Remover arquivos antigos**

```bash
git rm src/components/public/bracket-grid.tsx
git rm src/components/public/bracket-column.tsx
git rm src/components/public/bracket-match.tsx
git rm src/components/public/__tests__/bracket-match.test.tsx
```

- [ ] **Step 5: Rodar todos os testes**

```bash
npm test 2>&1 | tail -40
```

Expected: all passing.

- [ ] **Step 6: Rodar lint**

```bash
npm run lint 2>&1 | tail -20
```

Expected: no new errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: remove componentes antigos, adaptar simulator-tab"
```

---

### Task 16: Verificação final

- [ ] **Step 1: Rodar build completo**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds.

- [ ] **Step 2: Rodar testes completos**

```bash
npm test 2>&1 | tail -20
```

Expected: all pass.

- [ ] **Step 3: Rodar lint**

```bash
npm run lint
```

Expected: clean.

---

## Self-Review Checklist

- [x] Spec coverage: cada requisito da spec tem task correspondente
  - Desktop dois lados → Tasks 9, 10, 13
  - Mobile swipe → Tasks 11, 12
  - Conectores SVG → Task 8
  - 5 protótipos → Tasks 1-5
  - Path highlighting → Task 13 (highlightedTeam state)
  - Cards com estados → Task 7
  - getLadoSlot → Task 6
- [x] Placeholder scan: sem TBD/TODO
- [x] Type consistency: `BracketSlot` é importado de `@/lib/services/bracket/types` em todos os arquivos
