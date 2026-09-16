# Fitra — Online Store

A full online store built with **Node.js + Express + TypeScript** (backend) and plain **HTML/CSS/JS** (frontend, no build step). Includes a hidden admin panel (not linked from the customer site) and a customer-facing shop with cart, checkout, and simulated online payment.
👇

## Features

**Customer side**
- Product catalog with search, images, price, discount badge, stock indicator
- Product detail page with image gallery
- Per-customer shopping cart (persists in the database, tied to your logged-in account)
- Checkout with a full, detailed delivery address
- Choice of payment method at checkout: **cash on delivery** or **simulated online card payment** (card fields validated client + server side; card data is never stored)
- Order history page (shows chosen payment method)
- Fully Arabic (RTL) customer-facing UI
- Sign in with **Google** as an alternative to creating a new email/password account

**Admin side** (`/admin/login.html` — no link to it anywhere on the customer site)
- Secure login, separate from customer accounts
- Add / edit / delete products
- Upload **multiple images per product**
- Set price, discount %, description, and stock (available pieces) per product
- Show/hide a product from the storefront
- View and update order status (pending → processing → shipped → delivered / cancelled)
- Dashboard with quick stats

**Security checklist implemented**
- `helmet` HTTP security headers + a restrictive Content-Security-Policy
- Rate limiting (general traffic + stricter limits on login/checkout)
- Every request body/query/params validated with **zod** — nothing reaches a controller unvalidated
- Passwords hashed with **bcrypt** (12 salt rounds)
- Separate JWT secrets for admin vs. customer sessions, stored in **httpOnly, SameSite=strict** cookies (not readable by JS, mitigates XSS token theft)
- Admin routes protected by a `requireAdmin` middleware independent of the customer auth system
- SQL injection prevented via parameterized/prepared statements (`better-sqlite3`)
- File uploads restricted by MIME type, extension, size (5MB), and count (6 images); filenames are randomized server-side
- Stock is checked and decremented **inside a database transaction** at checkout, preventing overselling from concurrent orders
- Order totals are always recalculated from the database — the client can never dictate the price it pays
- Card number/CVV are format-validated then **discarded**, never written to the database
- Centralized error handler hides internal error details in production
- `.env` for all secrets (never committed — see `.gitignore`)

## Requirements

- [Node.js](https://nodejs.org) 18 or newer
- npm (comes with Node.js)
- Visual Studio Code (recommended)

## Setup (in VS Code)

1. Unzip the project and open the folder in VS Code.
2. Open a terminal in VS Code (`` Ctrl+` ``) and install dependencies:
   ```bash
   npm install
   ```
3. Copy the example environment file and edit it:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and:
   - Set `JWT_CUSTOMER_SECRET` and `JWT_ADMIN_SECRET` to two long random strings (different from each other).
   - Set `ADMIN_USERNAME` and `ADMIN_PASSWORD` to whatever you want your admin login to be — this account is created automatically the first time the server runs.
   - (Optional but needed for "Sign in with Google") Set `GOOGLE_CLIENT_ID` — see the section below.
4. Run the app in development mode (auto-restarts on file changes):
   ```bash
   npm run dev
   ```
5. Open the site:
   - Storefront: http://localhost:3000
   - Admin panel: http://localhost:3000/admin/login.html

### Production build (traditional Node hosting)

```bash
npm run build
npm start
```
In production, also set `NODE_ENV=production` and `COOKIE_SECURE=true` in `.env` (requires serving over HTTPS).

## Deploying to Vercel

The project already includes a `vercel.json` pointing straight at `src/server.ts`, so no
separate build step is required for the deploy itself — just push the repo and import it
in Vercel. Two things you must do for the live site to actually work:

1. **Set environment variables** in the Vercel project (Settings → Environment Variables) —
   everything listed in `.env.example`: `DATABASE_URL`, `JWT_CUSTOMER_SECRET`,
   `JWT_ADMIN_SECRET`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and optionally `GOOGLE_CLIENT_ID`. Also set
   `NODE_ENV=production` and `COOKIE_SECURE=true` (the site is served over HTTPS on Vercel,
   so cookies must be marked secure).
2. **Create the Supabase Storage bucket for images** — go to your Supabase project →
   Storage → New bucket → name it exactly `product-images` → **mark it Public**. Product
   photos and review screenshots are uploaded here (the server never writes images to its
   own local disk, since that storage does not persist between requests on Vercel — every
   request can land on a different, short-lived server instance). If the bucket doesn't
   exist, or isn't public, uploads will fail or the images simply won't load on the site.

After both are set, redeploy (or trigger a new deploy) so the running instance picks up the
environment variables.

## Project structure

```
fitra-website/
├── src/                     # TypeScript backend
│   ├── app.ts               # Express app, security middleware, route mounting
│   ├── server.ts            # Entry point
│   ├── config/              # env + database setup
│   ├── middleware/           # auth, validation, rate limiting, uploads, errors
│   ├── models/               # SQL schema
│   ├── controllers/          # business logic per resource
│   ├── routes/                # route wiring
│   ├── validators/            # zod schemas
│   ├── types/                  # shared TS types
│   └── utils/                   # jwt + password helpers
├── public/                  # customer-facing site (static, no build step)
│   ├── *.html
│   ├── css/style.css
│   └── js/*.js
├── admin/                   # admin panel (static, NOT linked from public/)
│   ├── *.html
│   ├── css/admin.css
│   └── js/*.js
├── uploads/products/        # uploaded product images (served at /uploads/products/...)
└── data/fitra.db             # SQLite database (created automatically)
```

## Notes on the payment flow

At checkout the customer picks **cash on delivery** (order is created as `unpaid`, settled by the courier) or **online card payment**. There's no real payment gateway wired in for the online option (that requires a merchant account and API keys, e.g. Stripe or Paymob). The checkout flow validates card details on the client and server, then simulates a successful authorization (`paid`) so the full order lifecycle works end-to-end. To go live, replace the payment block in `src/controllers/orderController.ts` with a real gateway call using a server-side secret key stored in `.env`.

## Setting up "Sign in with Google"

1. Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials), create an **OAuth 2.0 Client ID** of type **Web application**.
2. Under "Authorized JavaScript origins" add your site's URL (e.g. `http://localhost:3000` for local dev, and your real domain in production).
3. Copy the generated **Client ID** and put it in two places:
   - `.env` → `GOOGLE_CLIENT_ID=...` (used by the server to verify tokens)
   - `public/js/auth.js` → the `GOOGLE_CLIENT_ID` constant at the top of the file (used by the browser to show the button)
4. Restart the server. The "Continue with Google" button will appear on `/login.html` and `/register.html`. A customer who signs in with Google and has no existing account gets one created automatically (no password) — if they later sign in with the same email/password flow, it links to the same account.

---
