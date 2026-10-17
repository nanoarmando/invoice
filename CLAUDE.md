# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Production build
pnpm lint      # Run ESLint
pnpm start     # Start production server

# Docker
docker compose up --build     # Build and run
docker compose up --build -d  # Detached
docker compose down           # Stop
```

## What This Is

Single-page invoice generator. No auth, no backend. All data persisted in IndexedDB in the browser. Clicking "Download PDF" triggers `window.print()`.

## Architecture

Next.js 16 app using the App Router (`app/` directory). React 19, TypeScript (strict), Tailwind CSS v4. Built with `output: "standalone"` for Docker.

**Key files:**
- `app/page.tsx` — sidebar form UI, orchestrates state via `useInvoice`, renders Save & New / Reset buttons
- `app/globals.css` — Lilex font import, Tailwind theme, print styles
- `app/layout.tsx` — minimal layout, no font setup (font loaded via `@fontsource/lilex` in CSS)
- `lib/types.ts` — `Invoice` and `LineItem` interfaces, `defaultInvoice`, `newLineItem()`
- `lib/constants.ts` — `PAPER_W`, `PAPER_H` (A4 CSS pixels), `CURRENCIES` list
- `lib/store.ts` — IndexedDB read/write for `current-invoice` and `saved-invoice` keys
- `lib/use-invoice.ts` — `useInvoice()` hook: invoice state, auto-save, `saveAndNew()`, `resetInvoice()`
- `lib/utils.ts` — `cn()`, `formatDate()`, `formatCurrency()`
- `components/invoice-preview.tsx` — A4 preview component, manages its own scale/ResizeObserver, renders addresses with `whitespace-pre-line`
- `components/ui/` — shadcn/ui components (Button, Input, Textarea, Label, Select, DatePicker, Calendar, Popover)
- `Dockerfile` — multi-stage build: deps → builder → Alpine runner
- `docker-compose.yml` — single service, local build, host port 3010
- `docker-compose.casaos.yml` — CasaOS import file using `ghcr.io/nanoarmando/invoice:latest` (no `build:`; CasaOS cannot build)
- `.github/workflows/docker-publish.yml` — on push to `master`, builds `linux/amd64` + `linux/arm64` and pushes `:latest` and `:<sha>` to GHCR

**Key patterns:**
- `app/` — pages and layouts (App Router)
- shadcn/ui is configured (New York style, lucide icons, RSC enabled). Add components via: `pnpm dlx shadcn@latest add <component>`
- shadcn component defaults are overridden in the component files to match the black/white Lilex palette

## Invoice Data Model

```ts
interface Invoice {
  fromName, fromEmail, fromPhone, fromAddress       // sender
  toName, toEmail, toAddress                        // client
  invoiceNumber, issueDate, dueDate, currency       // details
  vatRate: number                                   // VAT % (0 = hidden)
  lineItems: LineItem[]                             // { id, description, quantity, rate }
  bankBeneficiary, bankName, bankAccount, bankSwift // payment details (SEPA-ready)
}
```

## Styling

- **Font:** Lilex (monospace) loaded via `@fontsource/lilex`. Set as `--font-sans` and `--font-mono` in Tailwind theme.
- **Palette:** black `#111111`, muted `#888888`, subtle `#BBBBBB`, border `#E5E5E5`, input bg `#FAFAFA`, canvas bg `#EBEBEB`
- Tailwind v4 with CSS custom properties in `globals.css` using `oklch()` color space.
- `--primary` and `--ring` CSS variables set to `oklch(0.13 0 0)` (~`#111111`) so shadcn Button and focus states match the palette.
- **Path alias:** `@/*` maps to the project root.

## Invoice Preview

`components/invoice-preview.tsx` renders the invoice at true A4 CSS dimensions (`794×1123px`, defined in `lib/constants.ts`) and uses `transform: scale()` driven by a `ResizeObserver` to fit the canvas — content never reflows, only scales. Print resets the transform so the browser prints at exact A4 size. Address fields use `whitespace-pre-line` to respect line breaks entered in the textarea.

## Print / PDF

- `window.print()` — no PDF library
- `@page { margin: 0; size: A4 }` — suppresses browser headers/footers in Chrome/Edge
- `print-color-adjust: exact` — preserves grey tones
- Sidebar and canvas background hidden via `print:hidden` / `print:bg-white`
- Invoice paper resets transform and fills the page with `print:!transform-none print:!w-full`

## IndexedDB

`lib/store.ts` opens `invoi-db` (version 1), object store `data`. Two keys are used:

| Key | Purpose |
|---|---|
| `current-invoice` | Live draft — auto-saved 400 ms after every change |
| `saved-invoice` | Last finalized invoice — template for the next one |

Both are managed via `loadInvoice`, `saveInvoice`, `loadSavedInvoice`, `persistSavedInvoice`, `clearSavedInvoice`. All calls silently fail if IndexedDB is unavailable.

## Invoice Workflow

### `saveAndNew()` (Save & New button)
1. Writes current invoice to `saved-invoice`.
2. Builds a new invoice carrying over: `fromName`, `fromEmail`, `fromAddress`, `fromPhone`, `toName`, `toEmail`, `toAddress`.
3. Auto-increments the invoice number trailing digits with zero-padding preserved (`INV-0099` → `INV-0100`).
4. Resets `issueDate` to today, clears `dueDate` and line items.

### `resetInvoice()` (Reset button)
Deletes both `saved-invoice` and `current-invoice` from IndexedDB and restores `defaultInvoice` state.

### First load with no draft
If `current-invoice` is absent but `saved-invoice` exists, the app pre-fills carry-over fields and increments the invoice number automatically — no user action required.

## Address Fields

Both `fromAddress` and `toAddress` use `<Textarea rows={3}>` (`components/ui/textarea.tsx`) instead of `<Input>`. The preview renders them with `whitespace-pre-line` so line breaks are reflected in the PDF.

## URL Params API

`useInvoice()` reads URL params on load and applies them over saved state. Any invoice field name is a valid param (e.g. `?fromName=Acme&vatRate=20`). The URL stays in sync as the user types via `history.replaceState`. Non-invoice params (e.g. `print=true`) are preserved. `?print=true` auto-triggers `window.print()` after load.

## Docker

Multi-stage `Dockerfile` (Alpine, non-root user `nextjs:nodejs`):
1. **deps** — `pnpm install --frozen-lockfile` via corepack
2. **builder** — `pnpm build` with `NEXT_TELEMETRY_DISABLED=1`
3. **runner** — copies `.next/standalone`, `.next/static`, `public`; runs `node server.js`

`next.config.ts` sets `output: "standalone"` to enable the optimized build.
`.dockerignore` excludes `node_modules`, `.next`, `.git`, docs, and env files.
