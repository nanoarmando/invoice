# invoi.xyz

![invoi.xyz — Free Invoice Generator](https://invoi.xyz/opengraph-image)

Free, open-source invoice generator. No account, no backend, no tracking beyond analytics. Create, preview, and download professional PDF invoices in seconds — everything happens in your browser.

**Live at [invoi.xyz](https://invoi.xyz)**

## Features

- Live preview as you type
- Download as PDF via browser print
- Data persisted locally in IndexedDB — nothing leaves your device
- 56 currencies supported
- VAT / tax rate field
- Bank transfer & SEPA payment details (Beneficiary, IBAN, BIC)
- Multi-line address fields with line-break support in the preview
- **Save & New** — saves the current invoice and opens a fresh one pre-filled with your company/client data and an auto-incremented invoice number
- **Reset** — clears all fields and starts from scratch
- URL query params API — pre-fill any field via URL, auto-print with `?print=true`
- Works on mobile

## Stack

- Next.js 16 (App Router, standalone output)
- React 19
- TypeScript (strict)
- Tailwind CSS v4
- shadcn/ui components
- Vercel Analytics

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docker

```bash
# Build and start
docker compose up --build

# Detached
docker compose up --build -d

# Stop
docker compose down
```

App available at `http://localhost:3010`.

### Prebuilt image and CasaOS

Every push to `master` builds a multi-arch image (`linux/amd64`, `linux/arm64`, each on a native runner in parallel) and publishes it to GitHub Container Registry via `.github/workflows/docker-publish.yml`:

```
ghcr.io/nanoarmando/invoice:latest
ghcr.io/nanoarmando/invoice:<commit-sha>
```

To install on CasaOS, open **App Store → + → Install a customized app → Import** and paste `docker-compose.casaos.yml`. The app is served on port `3010`. To update, pull the new `latest` image and recreate the app from CasaOS.

## Project Structure

```
app/
  page.tsx              # Main app (sidebar form + action buttons)
  layout.tsx            # Root layout + metadata
  globals.css           # Font, Tailwind theme, print styles
  opengraph-image.tsx   # OG image (next/og)
components/
  invoice-preview.tsx   # A4 invoice preview with print support
  ui/                   # shadcn/ui components (Input, Textarea, Button, …)
lib/
  types.ts              # Invoice + LineItem types, defaultInvoice
  use-invoice.ts        # State hook: auto-save, saveAndNew, resetInvoice
  store.ts              # IndexedDB read/write (current-invoice + saved-invoice)
  constants.ts          # Paper dimensions, currency list
  utils.ts              # formatDate, formatCurrency, cn()
Dockerfile              # Multi-stage build (deps → builder → runner)
docker-compose.yml      # Single-service compose file (local build)
docker-compose.casaos.yml  # CasaOS import file (uses the GHCR image)
.github/workflows/
  docker-publish.yml    # Builds and pushes the image to GHCR on push to master
```

## Invoice Workflow

### Auto-save
Every keystroke is debounced 400 ms and persisted to IndexedDB (`current-invoice`). Reloading the page restores your draft automatically.

### Save & New
Clicking **Save & New** in the sidebar:
1. Persists the current invoice to `saved-invoice` in IndexedDB.
2. Opens a new blank invoice pre-filled with:
   - Company name, email, address, phone
   - Client name, email, address
   - Invoice number auto-incremented (e.g. `INV-0042` → `INV-0043`, padding preserved)
   - Today's issue date, empty due date, fresh line items

### Reset
Clicking **Reset** clears both `current-invoice` and `saved-invoice` from IndexedDB and restores all fields to their defaults.

### First load with no draft
If there is no current draft but a `saved-invoice` exists, the app pre-fills the carry-over fields and increments the invoice number automatically.

## URL Params API

Any invoice field can be pre-filled via query params. Params stay in sync as you type.

```
https://invoi.xyz?fromName=Acme&currency=EUR&vatRate=20
```

| Param | Field |
|---|---|
| `fromName` | Company name |
| `fromEmail` | Company email |
| `fromPhone` | Company phone |
| `fromAddress` | Company address |
| `toName` | Client name |
| `toEmail` | Client email |
| `toAddress` | Client address |
| `invoiceNumber` | Invoice number |
| `issueDate` | Issue date (YYYY-MM-DD) |
| `dueDate` | Due date (YYYY-MM-DD) |
| `currency` | Currency code |
| `vatRate` | VAT % |
| `bankBeneficiary` | Beneficiary |
| `bankName` | Bank name |
| `bankAccount` | Account / IBAN |
| `bankSwift` | SWIFT / BIC |
| `print` | Set to `true` to auto-open print dialogue |

## PDF Export

Invoices are exported via `window.print()`. The preview renders at true A4 dimensions (`794×1123px`) and scales to fit the viewport — the print stylesheet resets the transform so the browser outputs exact A4. Chrome and Edge suppress browser headers/footers when `@page { margin: 0 }` is set.

## License

MIT
