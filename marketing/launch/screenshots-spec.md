# Screenshots specification

Six 1600 × 900 PNGs (Shopify App Store + Product Hunt + landing page).
Each one is a single screen that tells one story; the headline is
overlaid in the bottom-left corner.

| # | Filename                  | Headline                                          | Capture from                                              |
|---|---------------------------|---------------------------------------------------|-----------------------------------------------------------|
| 1 | `01-inbox-overview.png`   | "Your support inbox, half empty."                 | `/inbox` — 12 tickets, 8 marked Auto-resolved             |
| 2 | `02-ticket-detail.png`    | "AI drafts. You click."                           | `/inbox/ticket/<id>` — open ticket with AI draft + Approve |
| 3 | `03-rules-editor.png`     | "Auto-refund the easy ones."                      | `/settings/rules` — visual rule builder, fraud guards     |
| 4 | `04-analytics.png`        | "75% auto-resolution. $4,210 saved this month."   | `/dashboard` — KPI cards + intent breakdown chart         |
| 5 | `05-channels.png`         | "Email, chat, WhatsApp — one place."              | `/integrations` — three connected channels                 |
| 6 | `06-onboarding.png`       | "From install to live in 5 minutes."              | `/onboarding` step 5 (test ticket reply)                  |

## Style guide
- Background: pure white outside the screenshot, subtle drop shadow
  (`0 8px 32px rgba(15,23,42,0.12)`).
- Headline font: Inter Display Semibold, 56px, color `#0F172A`.
- Subhead (one line, optional): Inter, 22px, color `#475569`.
- Brand mark: small "ResolveAI" wordmark top-right, 24px.
- Use real-looking, anonymized data only (no real merchant names).

## Capture instructions
1. Run the seed script (`pnpm seed`) — it creates 50 representative
   tickets with mixed channels and intents.
2. Use Chrome at 1600×900 with `--force-device-scale-factor=2`.
3. Use the dev "screenshot" Tailwind theme overrides in
   `apps/web/.env.local.screenshot` to flatten colors and hide cursor.
4. Save as PNG with no compression artifacts; export at 2x for retina.

## Mobile screenshots (App Store optional)
390 × 844 (iPhone 14 Pro). Capture the same six screens in mobile
viewport. Use the dashboard's responsive layout, no special build.
