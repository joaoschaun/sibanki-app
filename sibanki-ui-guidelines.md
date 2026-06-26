# Sibanki UI/UX & Design System Guidelines

This document outlines the strict UI/UX architectural rules and design system constraints for **Sibanki** (Virtus Financeiro). 
Any AI assistant (Antigravity, Claude Code, Cursor, etc.) MUST read and strictly adhere to these rules before modifying or creating any frontend screens or components.

---

## 1. Core Philosophy (Pierre Finance Design System)
The Sibanki UI is designed to look like a premium, state-of-the-art financial OS. It is inspired by high-density, high-information investment platforms (like TradingView and Bloomberg Terminals) combined with a sleek, minimalist Scandinavian aesthetic.

*   **Monochromatic & High Contrast**: Visual clutter is eliminated. Pure blacks, dark grays, and whites form the foundation.
*   **No Decorative Colors**: Colors are strictly reserved for communicating **financial state** (e.g., positive vs. negative balance, budget alerts). Do not use colors for aesthetic decoration or generic buttons.
*   **Zero Placeholders**: Never use placeholder text or mock generic graphics. All charts and data flows must represent realistic financial data.
*   **High Information Density**: Show real numbers, trends, limits, and timelines. Avoid empty spaces, giant paddings, or childishly large components.

---

## 2. Color Palette & CSS Variables
All colors must be sourced from CSS variables defined in `src/index.css`. **Do not write arbitrary hex codes or raw Tailwind color classes (like `bg-blue-500` or `bg-slate-900`) for custom elements unless they are standard semantic variables.**

### Core Surface Variables
*   **Background (Fundo)**: `var(--si-bg)` (Dark: `#0a0a0a` | Light: `#f0f4f8`)
*   **Cards (Superfícies)**: `var(--si-card)` (Dark: `#111111` | Light: `#ffffff`)
*   **Borders (Bordas)**:
    *   Slight border: `var(--si-border)`
    *   Medium border: `var(--si-border-md)`
    *   Large border: `var(--si-border-lg)`
    *   Extra-Large border: `var(--si-border-xl)`
*   **Glass Fills / Hover Overlays**:
    *   `var(--si-over-1)` to `var(--si-over-4)`

### Typography Contrast Variables
*   **Text 1 (High contrast/Title)**: `var(--si-text-1)`
*   **Text 2 (Primary content)**: `var(--si-text-2)`
*   **Text 3 (Secondary content)**: `var(--si-text-3)`
*   **Text 4 (Muted labels)**: `var(--si-text-4)`
*   **Text 5 (Subtle/Placeholder)**: `var(--si-text-5)`

### Semantic Financial Feedback Colors
Colors MUST ONLY represent financial states:
*   🟢 **Positive** (Conquista, spread positivo, meta batida): `var(--si-positive-bg)` + `var(--si-positive-text)` (Emerald tone)
*   🟡 **Warning** (Atenção, orçamento perto do teto): `var(--si-warning-bg)` + `var(--si-warning-text)` (Amber tone)
*   🔴 **Risk** (Perigo, dívida cara, auto-sabotagem): `var(--si-risk-bg)` + `var(--si-risk-text)` (Rose/Red tone)
*   🟣 **Projection** (Projeções/Portal do Tempo): `var(--si-projection-bg)` + `var(--si-projection-text)` (Violet tone)
*   🔵 **Info** (Neutro informativo): `var(--si-info-bg)` + `var(--si-info-text)` (Blue tone)

---

## 3. Typography & Text Formatting
*   **Font Family**: `Inter`, sans-serif (configured globally).
*   **All Caps Labels**: Secondary labels, section headers, badges, and tabs should use uppercase, tracking wide, and bold text:
    ```tsx
    <h3 className="text-[11px] font-bold text-si-5 uppercase tracking-[0.18em]">
      Análise Visual
    </h3>
    ```
*   **Currency Formatting**: All monetary values must format with Brazilian Portuguese locales:
    ```typescript
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
    // Or for plain numbers:
    `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ```

---

## 4. Components & Layout Constraints

### Layout Architecture
*   **Mobile-First**: Stack layouts vertically using `flex flex-col` and `gap-4` (or `space-y-4`).
*   **Responsive Grids**: For larger screens, align widgets side-by-side:
    ```tsx
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
      <div className="lg:col-span-2 space-y-6"> {/* Main Column */} </div>
      <div className="space-y-6"> {/* Sidebar / Widgets */} </div>
    </div>
    ```
*   **Tabs and Segmented Controls**: Keep filters and tab controls compact, uppercase, tracking-wide:
    ```tsx
    <button className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider">
    ```

### Strict Button Rules
*   **No Solid Colorful Buttons**: Solid blue, red, or green buttons are strictly forbidden (guarded by design system unit tests).
*   **CTAs and Primary buttons**: Use high contrast monochrome styles:
    *   **Dark Mode**: Background `bg-white` and text `text-zinc-900`
    *   **Light Mode**: Background `bg-zinc-900` and text `text-white`
*   **Secondary buttons**: Use `bg-si-over-1` or `bg-si-over-2` with `border border-si-border`.
*   **Icons**: Use outline icons from `lucide-react`. Ensure icons are sized properly (typically `w-4 h-4` or `w-5 h-5`).

---

## 5. Technology Stack Integration

1.  **State Management (Zustand)**: Consolidate global UI state in `src/store/useUiStore.ts`.
2.  **Financial Contexts**: Always consume financial profile data via `AppContext` (or `useAppContext()`) and intelligence calculations via `IntelligenceContext` (or `useIntelligence()`). Never create ad-hoc `onSnapshot` queries directly inside page routes.
3.  **No Arbitrary CSS Files**: Write styles exclusively inside `.tsx` components using Tailwind classes. Do not use CSS Modules, styled-components, or inject custom raw CSS files.
4.  **Tailwind CSS**: Adhere to Tailwind v4 syntax. Use CSS variables directly mapped inside Tailwind configs where possible.
