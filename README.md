# WorkshopHub

A complete MVP Workshop Management System for automotive & motorcycle workshops — built with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, Socket.IO, and PostgreSQL**. No frontend framework is used anywhere in this project.

Every feature described below is fully wired to a real PostgreSQL database through a REST API — there is no mock/dummy data.

---

## 1. Tech stack

| Layer          | Technology                              |
|----------------|------------------------------------------|
| Frontend       | HTML5, CSS3, Vanilla JavaScript          |
| Backend        | Node.js + Express.js (REST + MVC)        |
| Database       | PostgreSQL                               |
| Auth           | JWT + bcrypt                             |
| Realtime       | Socket.IO                                |
| File uploads   | Multer                                   |

---

## 2. Prerequisites (macOS + VS Code)

1. **Node.js 18+** — check with `node -v`. Install via [nodejs.org](https://nodejs.org) or `brew install node`.
2. **PostgreSQL 14+** — install via `brew install postgresql@16` then `brew services start postgresql@16`, or use [Postgres.app](https://postgresapp.com/).
3. **VS Code** with any Node/PostgreSQL extensions you like (optional).

---

## 3. Setup

```bash
# 1. Install dependencies
npm install

# 2. Create the database (name must match .env)
createdb workshophub

# 3. Copy the environment template and fill in your local Postgres credentials
cp .env.example .env
```

Open `.env` and set at minimum:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workshophub
DB_USER=<your mac username or "postgres">
DB_PASSWORD=<your postgres password, blank is fine for local trust auth>
JWT_SECRET=<any long random string>
```

```bash
# 4. Create all tables (roles, users, customers, vehicles, mechanics,
#    bookings, services, service_status, spare_parts, inventory,
#    transactions, notifications)
npm run migrate

# 5. Seed the one required Administrator account
npm run seed

# 6. Start the server
npm run dev      # auto-restarts on file changes (nodemon)
# or
npm start
```

The app is now running at **http://localhost:5000** — both the API (`/api/...`) and the vanilla HTML/CSS/JS frontend are served from this single Express server, so there is nothing else to start.

---

## 4. Logging in

**Administrator (seeded automatically):**
```
Email/Username: admin  (or admin@workshophub.local)
Password:       admin123
```

**Customer:** click "Create one" on the login page to self-register — registration is fully live against the database (no dummy accounts).

You can change the seeded admin credentials any time by editing `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` and re-running `npm run seed` (it's idempotent — safe to re-run).

---

## 5. Project structure

```
/client
  /public
    /css        -- design tokens, base styles, components, layout, auth
    /js
      /shared   -- api client, session/auth, socket.io wrapper, toast, modal, ui helpers, layout renderer
      /admin    -- one script per admin page
      /customer -- one script per customer page
    /admin      -- admin HTML pages
    /customer   -- customer HTML pages
    login.html, register.html, index.html

/server
  /config       -- PostgreSQL connection pool
  /database     -- schema.sql, migrate.js, seed.js
  /middleware   -- JWT auth, role authorization, multer upload, validation, error handling
  /models       -- one file per table/domain, raw parameterized SQL (no ORM)
  /controllers  -- request handlers / business logic
  /routes       -- REST endpoint definitions
  /sockets      -- Socket.IO auth + room management + emit helpers
  /uploads      -- avatar & vehicle photo uploads (served at /uploads/...)
  app.js        -- Express app wiring
  server.js     -- HTTP + Socket.IO entrypoint
```

---

## 6. Feature checklist (all live, all connected to PostgreSQL)

**Administrator**
- Dashboard: total customers, total vehicles, vehicles in queue, vehicles under repair, completed services today, total revenue, low stock spare parts, pending bookings — plus a 14-day revenue chart and live pipeline breakdown.
- Customer management: view / search / edit / delete.
- Vehicle management: register (for any customer) / edit / delete / full service history.
- Booking management: accept / reject / reschedule — accepting instantly creates a live job card in the queue.
- Mechanic management: add / edit / delete, with live active-job counts.
- Service management: walk-in service creation, status pipeline (Waiting → Vehicle Checked In → Inspection → Repairing → Waiting for Spare Parts → Quality Check → Ready for Pickup → Completed), mechanic assignment, spare-parts consumption (auto stock reduction), invoicing.
- Spare parts: CRUD, SKU, pricing, low-stock threshold & indicator.
- Inventory: manual stock-in / stock-out plus a full movement ledger (including automatic reductions from services).
- Reports: services, bookings, revenue (with payment-method breakdown & trend), inventory.
- Global search across customers, vehicles, bookings, spare parts and invoices.

**Customer**
- Register / log in / log out (JWT), profile management, password change, avatar upload.
- Vehicle registration, edit, delete, photo upload, full service history.
- Book a service (vehicle, service type, date, time, notes) and see all past bookings.
- Live service tracking via Socket.IO: pipeline visualization, queue position, estimated wait/ready time, assigned mechanic, repair notes, estimated cost — updates instantly, no refresh.
- Transaction / invoice history.

**Realtime (Socket.IO)** — instant updates with no page refresh for: new bookings, booking status changes, new services, service/status/mechanic changes, spare part & inventory changes, new/updated invoices.

---

## 7. Notes

- All passwords are hashed with bcrypt; all authenticated endpoints require a valid JWT; admin-only endpoints are protected by role-based middleware.
- All SQL is parameterized (`$1, $2, ...`) — no string concatenation of user input, protecting against SQL injection.
- Uploaded files (avatars, vehicle photos) are validated by mime-type and size and stored under `server/uploads/`.
