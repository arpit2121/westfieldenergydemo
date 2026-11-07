# Westfield Energy – Procure-to-Pay demo (frontend)

React + Vite, Material UI (custom monochrome theme), Redux Toolkit. No backend yet:
all data is dummy data held in Redux and saved to the browser's localStorage.

```bash
npm install
npm run dev
```

## Logins

Every user's password is `demo@123`, or click a demo account on the sign-in page.
Once inside, the **Login as** switcher in the top bar changes user without signing out.

| Team | User | Role |
| --- | --- | --- |
| Engineering | Ravi Kumar / Meera Iyer / Suresh Rao | Creator / Reviewer / Approver |
| Management | Anita Desai | Approver (PR > ₹10 L, TBE) |
| C&P | Vikram Shah / Neha Kapoor | Lead / Buyer |
| Finance | Karan Mehta / Priya Nair | Reviewer / Approver |
| Stores | Ajay Singh / Deepak Joshi / Rohan Verma | Preparer / Reviewer / Approver |
| Third party | M. Fischer (TÜV) | Technical inspector |
| Logistics | SwiftCargo Ops | Shipping partner |
| Suppliers | Bharat, Alpha, Crest, Delta (import), Eastline, Fortune | Supplier portal |

## The flow (one record, PR → closed)

PR → Eng review → Eng approval → Management (if > ₹10 L) → C&P assigns buyer →
RFQ/RFX published to suppliers → supplier quotes (Bharat quotes live, the other 5 are pre-filled) →
TBE internal → TBE third party → TBE approval (prices sealed until here) →
CBE unseals prices and ranks L1–L5 with T1/T2/T3 chips → QCS + award → QCS approval →
Draft PO + LOI → Finance review → Finance approval (PO issued) → supplier accepts, uploads ABG/PBG →

- **Local:** advance go-ahead → ABG verify → advance paid → dispatch → logistics milestones + ETA
- **Import:** LC opened → shipped + documents → payment against documents → sea freight, customs, ETA

→ MRN prepare → review (skippable via *Workflow Rules*) → approve → 3-way match → balance paid → **Transaction Closed**.

The Local / Import toggle on the PO re-orders the remaining steps live.

## Presenter tools

User menu (top right) → **Demo controls**: start a fresh bushing-set transaction already advanced
to a given stage, fast-forward any open transaction, or reset all data.

## Code map

- `src/data/masters.js` – users, roles, suppliers, items, workflow rules (mirrors the Prisma schema)
- `src/store/flow.js` – the workflow: step list, who can act, what each step changes
- `src/store/engine.js` – runs steps against state; writes audit log + notifications
- `src/data/seed.js` – background transactions for dashboards
- `src/pages/case/*` – one tab per stage of the transaction page
- `src/theme/theme.js` – MUI theme (compact, black & white)

When the Node API arrives, `engine.js` / `flow.js` move server-side and the slice reducers become API calls.
