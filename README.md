# NEXORA — Future of Shopping

Full-stack dark futuristic e-commerce platform built with React, Vite, Tailwind CSS, Express.js, Drizzle ORM, Cloud SQL (PostgreSQL), Firebase Authentication, and Chart.js.

## Features

### Customer Storefront
- **Homepage**: Flagship hardware hero with live search, curated discipline categories, interactive Featured / New Arrivals / Best Sellers showcase, promotional coupon info (`NEXORA10`, `WELCOME25`), and newsletter signup.
- **Catalog**: Backend-driven search, category filtering, price bounds, in-stock filter, sorting, grid/list layout toggle, and pagination.
- **Product Details**: Multi-image gallery, variant selector, specifications table, live stock indicator, wishlist toggle, related products, and verified-purchaser product reviews.
- **Persistent Shopping Bag**: Database-backed cart for both guest sessions (`x-cart-session`) and signed-in accounts, merging seamlessly upon login.
- **Checkout & Orders**: Saved address selector, server-validated discount codes, server-calculated totals & shipping, Cash on Delivery (COD), PayMongo Sandbox hosted checkout + HMAC-SHA256 webhook verification, and step-by-step order tracking with transactional cancellation/stock restoration.

### Administrator Console (`/admin`)
- **Overview**: Total revenue, orders, customers, active products, pending/delivered counts, 14-day revenue trend chart, low-stock alerts, recent orders, and best sellers.
- **Products & Categories**: Full CRUD with multiple product image URLs, specifications, variants, and archive controls.
- **Orders**: Filter by status, inspect itemized receipts, update fulfillment stage & tracking numbers, and automatically reconcile stock on cancellation.
- **Inventory**: Stock adjustment console with immutable `inventory_logs` ledger.
- **Customers, Coupons, Reports & Settings**: Account status management, coupon code builder, daily/monthly/yearly Chart.js analytics, and store shipping/payment configuration.

## Database & Authentication Setup

- **Database**: Provisioned on Cloud SQL for PostgreSQL and managed with Drizzle ORM (`src/db/schema.ts`, `src/db/index.ts`, `src/db/drizzle.config.ts`).
- **Authentication**: Supports Firebase Google Sign-In (`signInWithPopup`) verified via `firebase-admin` as well as customer email/password registration & login with `bcryptjs` and server-signed JWTs.
- **Admin Access**:
  - Signing in with Google using the project owner's email automatically grants administrator access.
  - Alternatively, configure `ADMIN_EMAIL` and `ADMIN_PASSWORD` in environment secrets, or use the one-time **Claim Initial Admin Account** form on `/login` on first run.

## Local Development & Deployment

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (`.env.example` lists optional `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, and `CLOUDINARY_*` values alongside runtime `SQL_*` Cloud SQL variables).
3. Start the full-stack server on port `3000`:
   ```bash
   npm run dev
   ```
4. Build for production:
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```
