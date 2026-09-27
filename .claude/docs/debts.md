# Debts page

`/gustavo/trips/[slug]/debts` — who pays whom to settle a trip, and the proof
that the numbers are right. Redesigned Sept 2026; the group cares a lot about
trusting the math, so every screen here is built to be checkable.

## Where things live

| Piece | File |
|---|---|
| Page (state, settle/undo, proof rows) | `app/gustavo/trips/[slug]/debts/page.tsx` |
| Chart card (waterfall, direction key, "To pay" bar, maths button) | `components/debt/balance-card.tsx` |
| Payments card (yours / everyone else / settled, swipe to undo) | `components/debt/payments-card.tsx` |
| Expense list under a tapped row (search, 6 sorts, debt column) | `components/debt/proof-list.tsx` |
| "How it adds up" popover (balances → steps → payments) | `components/debt/plan-popover.tsx` |
| Page ⓘ help (pictures, not paragraphs) | `components/debt/debts-help.tsx` |
| View state per trip (person, plan, selected row) | `components/debt/debts-view-store.ts` |
| Money formatting (always 2 decimals) | `components/debt/ledger-money.ts` |
| Pure math — plans, rounding, waterfall, hand-offs | `lib/debt-proof.ts` (tests: `tests/debt-proof.test.ts`) |
| Base debt math (debt map, simplify, pair nets) | `lib/debt.ts`, `lib/spend.ts` `computeDebtMap` |
| Gallery (6 scenarios under real providers) | `app/dev/gallery/debt/page.tsx` |

## The math (lib/debt-proof.ts)

- **Two plans.** `fewest` = `simplifyDebts` (greedy: biggest payer pays
  biggest receiver, repeat — may route money through a third person).
  `direct` = "Pay who you owe": each pair's net with loops cancelled
  (`directPlan`) — never pays anyone you don't owe, never more than you owe
  them. Both land every person on the same balance.
- **One plan per trip.** Each settlement stores `plan` (migration 00041;
  NULL = legacy = fewest). `lockedPlan(records)` is the trip's plan once any
  payment exists; the API rejects the other plan with 409 (row-locks the trip
  so concurrent settles can't mix). Undo every payment → unlocked.
- **Cents that add up.** Everything is integer cents. `roundToTotal` rounds a
  list so it sums to an exact target (largest-remainder), anchored top-down:
  plan payments → waterfall rows (`balanceSteps`, anchored to
  `planNetCents`) → per-expense effects (anchored to the row). A row can be a
  cent off its own naive rounding; that's deliberate — the levels always
  agree.
- **Expense effects** (`expenseBalanceEffects`) mirror `computeDebtMap` rule
  for rule; a test asserts they sum to the debt map's pair nets.
- `planHandoffs` (why a payment goes to someone you don't owe, as swaps) is
  tested but currently unused — the popover's step diagrams replaced the
  "Why these people?" sentences. Delete or reuse.
- **Don't change calculation behaviour without Ivan's OK**, and run
  `pnpm test` after touching `lib/debt*.ts`.

## UI decisions (and why)

- **Waterfall rows**: one per counterparty (expenses only), then payments
  made after a heavier divider (no label row — the rows say Paid / From and
  are hatched green). Payments sit at the bottom, not under their person:
  under Fewest payments they often go to someone other than who the
  expenses say, and pairing them read as an error.
- **Amounts** live in a right-hand column, always 2 decimals, never on the
  bars. Bars are positioned in `%` (not measured px) so they're right on
  first paint.
- **Direction key** ("← You owe | Owed →") sits in the header's spare space
  on the $0 line; it measures itself (canvas `measureText`) and shortens /
  compacts / hides rather than ever touching the total.
- **Kind to the group**: no stats comparing people; neutral wording (who
  pays whom).
- **Settle** is one tap + Undo on the toast (optimistic cache update). Only
  payer, receiver, or trip owner/admin can settle or undo
  (`canSettlePayment`, enforced server-side too).
- **Expense list rows** are the Expenses page's own `ExpenseRow` plus a
  `trailing` debt column (unsigned amount in red/green, 👥 split count, 🎁 if
  someone was treated), 12px even padding around a dashed divider, one
  column width for the whole list (measured from its widest amount).
- **Section titles sit above their card** (Payments, the expense list); the
  chart card's "YOU PAY" is its headline, so it stays inside.
- **The popover** is a centred Dialog (Ivan dislikes drawers) with a pinned
  title row so ✕ is always reachable. When everything's paid it shows the
  plan from expenses only, ticking the payments that match.
