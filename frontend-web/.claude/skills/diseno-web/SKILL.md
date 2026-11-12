---
name: diseno-web
description: Design system of the Urban Pulse web panel (frontend-web) with its real colors, typography, spacing and ready-to-copy Tailwind recipes. Use before creating or restyling any screen, component, button, form, modal or badge in frontend-web, or when asked "que colores usamos", "que estilo tiene la web", "haz una pantalla nueva", "diseño", "paleta", "tema oscuro".
---

# Diseno web

Extracted from `frontend-web/src` (branch of PR #129, 2026-11-09). Stack: Tailwind CSS 3.4, `lucide-react`, no UI library. User-facing text is in Spanish.

## Style in one line
Sober institutional admin panel: near-monochrome grey (`zinc`), black primary button that inverts in dark mode, and color only to convey meaning.

## Hard rules
- Use only Tailwind utility classes in `className`. No inline styles, CSS modules or new UI libraries.
- Every color needs its `dark:` counterpart. Dark mode is the `dark` class on `<html>`, driven by `src/hooks/use-theme.ts`.
- Neutrals are always `zinc`; never `gray`, `slate`, `neutral` or `stone`.
- Color means state only: `emerald` success, `amber` warning or simulated data, `red` error or destructive action.
- `indigo` and `rose` exist only as decoration in `technical-console.tsx` and `demo-accounts.tsx`. Do not use them in product screens.
- No emojis. Icons come from `lucide-react`.
- Reuse the recipes below before inventing variants.

## Palette usage measured in the code
774 color classes: `zinc` 596 (77%), `emerald` 58, `white` 50, `amber` 23, `indigo` 14, `red` 13, `rose` 9, `transparent` 6, `black` 4, `blue` 1.

| Token | Hex | | Token | Hex |
| --- | --- | --- | --- | --- |
| zinc-50 | #fafafa | | zinc-600 | #52525b |
| zinc-100 | #f4f4f5 | | zinc-700 | #3f3f46 |
| zinc-200 | #e4e4e7 | | zinc-800 | #27272a |
| zinc-300 | #d4d4d8 | | zinc-900 | #18181b |
| zinc-400 | #a1a1aa | | zinc-950 | #09090b |
| zinc-500 | #71717a | | white | #ffffff |

Semantic colors (hex): emerald-50 #ecfdf5, emerald-600 #059669, emerald-800 #065f46; amber-50 #fffbeb, amber-600 #d97706, amber-800 #92400e; red-50 #fef2f2, red-600 #dc2626, red-800 #991b1b.

## Color roles

| Role | Light | Dark |
| --- | --- | --- |
| Page background | `bg-zinc-50` | `dark:bg-zinc-950` |
| Panel card | `bg-white` | `dark:bg-zinc-900/40` |
| Elevated surface (login card, modal, menu) | `bg-white` | `dark:bg-zinc-900` |
| Header | `bg-white` | `dark:bg-zinc-900/50` |
| Border | `border-zinc-200` | `dark:border-zinc-800` or `dark:border-zinc-800/60` |
| Inner divider | `border-zinc-100` | `dark:border-zinc-800/60` |
| Main text | `text-zinc-900` | `dark:text-zinc-100` |
| Secondary text and section labels | `text-zinc-600` | `dark:text-zinc-400` |
| Help text | `text-zinc-500` | `dark:text-zinc-400` |
| Placeholder | `placeholder-zinc-400` | `dark:placeholder-zinc-600` |
| Hover on ghost control | `hover:bg-zinc-100` | `dark:hover:bg-zinc-800` |

## Typography
- Font: `font-sans`, declared as Inter with `system-ui` fallback. Inter is not loaded yet, see Known issues.
- Sizes in use: `text-xs` 49, `text-sm` 27, `text-[11px]` 27, `text-base` 9, `text-[10px]` 7, `text-xl` 3, `text-2xl` 2. Body and forms use `text-sm` or `text-xs`.
- Weights: `font-bold` is the default emphasis (66), `font-semibold` for secondary (23), `font-black` only for main titles (5).
- `font-mono` for ids, coordinates, tokens and technical values.
- Screen title: `text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100`.
- Card title: `text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100`.
- Section label: `text-sm font-bold uppercase tracking-widest text-zinc-600 dark:text-zinc-400`.

## Shape, spacing and motion
- Radius: `rounded-xl` for cards, inputs and main buttons; `rounded-2xl` for login card and modals; `rounded-lg` for small buttons and icon tiles; `rounded-full` for pills and spinners; `rounded` for badges.
- Shadow: `shadow-sm` on panel cards, `shadow-xl` on login card and menus, `shadow-2xl` on modals.
- Padding: `p-6` on panel cards, `p-3.5` on alerts, `p-4` on options, `px-6` on headers. Gaps: `gap-2`, `gap-1.5` inside controls, `gap-4` and `gap-6` between blocks.
- Icons: `w-4 h-4` by default, `w-3.5 h-3.5` in small buttons, `w-5 h-5` in large buttons. Decorative alert icons get `shrink-0 mt-0.5`.
- Motion: `transition-colors` for hover, `transition-all` on main buttons, durations 150 to 300 ms.
- Layout: header `h-16`. Login is a centered `max-w-[420px]` column. The validation screen is `h-screen` with two columns `flex-[5.5]` and `flex-[4.5]`, each with its own scroll (`overflow-y-auto hide-scroll`).

## Recipes

| Element | Classes |
| --- | --- |
| Panel card | `bg-white dark:bg-zinc-900/40 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/60 shadow-sm` |
| Login card | `bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-7 sm:p-8` |
| Header | `h-16 flex justify-between items-center px-6 border-b border-zinc-200 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 shrink-0 shadow-sm z-10` |
| Primary button | `bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold rounded-xl shadow-sm transition-all` |
| Secondary button | `bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300 font-semibold rounded-xl transition-all` |
| Disabled button | `bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed shadow-none` |
| Option, selected | `border-2 rounded-xl border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900` |
| Option, not selected | `border-2 rounded-xl border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700` |
| Text input | `w-full py-2.5 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:border-transparent` |
| Modal overlay | `fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm` |
| Modal | `w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6` |
| Spinner | `w-6 h-6 border-2 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin` |
| Badge | `px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300` |

Alert template; replace `emerald` with `amber` or `red` according to meaning:

```tsx
<div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl flex items-start gap-2.5 text-emerald-800 dark:text-emerald-300 text-xs">
  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
  <p className="font-semibold">{message}</p>
</div>
```

## Known issues: do not copy them
- `shadow-xs`, `py-0.2`, `animate-in` and `fade-in` have no effect with Tailwind 3 and the current config. Use `shadow-sm`, `py-0.5` and `transition` classes.
- Inter is declared in `tailwind.config.ts` but never loaded, so the real font depends on the machine.
- The theme is not persisted and resets to light on reload.
- `resolution-form.tsx` shows errors in grey. New errors use the red alert.
- Login and panel have two slightly different headers. New screens use `AppHeader`.
- The validation screen is not responsive. New screens must work from 375 px wide using `sm:` and `md:`.
- Some labels are still in English ("Technical Inspection"). New text is Spanish.
- `src/App.css` is not imported. Do not add styles there.

## Before finishing a screen
- [ ] Checked in light and dark mode.
- [ ] Only colors and roles from this guide.
- [ ] Loading, error and empty states use the spinner and alert recipes.
- [ ] Icon-only buttons have a `title` or `aria-label`, and every non-submit `<button>` has `type="button"`.
