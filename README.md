# Farmart — Farm Animal Marketplace

A full-stack e-commerce marketplace for buying and selling farm animals in Kenya. Farmers list their livestock, buyers browse and purchase, and the platform handles the full lifecycle from listing to payment.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Backend Setup](#backend-setup)
  - [Frontend Setup](#frontend-setup)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Authentication & Authorization](#authentication--authorization)
- [Key Design Decisions](#key-design-decisions)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## Overview

Farmart connects Kenyan farmers directly with buyers looking to purchase farm animals. Farmers manage listings (cattle, goats, sheep, and more), upload images, and process incoming orders. Buyers browse the marketplace, filter by category, add items to cart, and checkout with delivery details. The platform supports M-PESA and card payment integrations.

---

## Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| React | 19.2.4 | UI framework |
| TypeScript | 5.9.3 | Static typing |
| Vite | 8.0.1 | Build tool & dev server |
| React Router | 7.14 | Client-side routing |
| Tailwind CSS | 4.2.2 | Utility-first styling |
| shadcn/ui | (via base-ui) | Accessible UI components |
| Lucide React | 1.7.0 | Icon library |
| clsx + tailwind-merge | — | Dynamic className management |
| react-countup | — | Animated statistics |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| Flask | 3.0.3 | Web framework |
| Python | 3.12 | Runtime |
| PostgreSQL (Supabase) | — | Relational database |
| SQLAlchemy | (via Flask-SQLAlchemy 3.1.1) | ORM |
| Flask-Migrate / Alembic | 4.0.7 | Database migrations |
| Flask-JWT-Extended | 4.6.0 | JWT authentication |
| bcrypt | — | Password hashing |
| Cloudinary | 1.40.0 | Image storage & CDN |
| SendGrid | 6.11.0 | Transactional email |
| Marshmallow | 3.21.3 | Input validation & serialization |
| Flask-CORS | 4.0.0 | Cross-origin resource sharing |
| pytest + pytest-cov | 8.2.0 | Testing & coverage |

---

## Project Structure

```
farmart/
├── frontend/                          # React/TypeScript application
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/            # Reusable UI components
│   │   │   │   ├── ui/               # Base UI primitives
│   │   │   │   ├── Navbar.tsx         # Top navigation bar
│   │   │   │   ├── Footer.tsx         # Site footer
│   │   │   │   └── AnimalCard.tsx     # Listing card component
│   │   │   ├── pages/                 # Route-level page components
│   │   │   │   ├── LandingPage.tsx
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   ├── RegisterPage.tsx
│   │   │   │   ├── MarketplacePage.tsx
│   │   │   │   ├── AnimalDetailsPage.tsx
│   │   │   │   ├── CartPage.tsx
│   │   │   │   ├── CheckoutPage.tsx
│   │   │   │   ├── PaymentSuccessPage.tsx
│   │   │   │   ├── MyOrdersPage.tsx
│   │   │   │   ├── VerifyEmailPage.tsx
│   │   │   │   └── farmer/            # Farmer dashboard pages
│   │   │   │       ├── FarmerLayout.tsx
│   │   │   │       ├── DashboardPage.tsx
│   │   │   │       ├── MyListingsPage.tsx
│   │   │   │       ├── AddAnimalPage.tsx
│   │   │   │       ├── EditAnimalPage.tsx
│   │   │   │       └── OrdersPage.tsx
│   │   │   ├── context/
│   │   │   │   └── AppContext.tsx      # Global state (auth, cart, animals)
│   │   │   ├── lib/
│   │   │   │   └── utils.ts            # Tailwind utility helpers
│   │   │   ├── data/
│   │   │   │   └── mockData.ts         # TypeScript type definitions
│   │   │   ├── routes.tsx             # React Router configuration
│   │   │   └── App.tsx
│   │   └── styles/
│   │       └── index.css
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   ├── .env.example
│   └── README.md                      # ← you are here
│
└── backend/                           # Flask Python API
    ├── app/
    │   ├── models/                    # SQLAlchemy ORM models
    │   │   ├── base.py               # Shared BaseModel (id, timestamps)
    │   │   ├── user.py               # User, FarmerProfile, BuyerProfile, VerificationToken
    │   │   ├── animal.py             # AnimalType, Breed, Animal, AnimalImage
    │   │   ├── cart.py               # Cart, CartItem
    │   │   ├── order.py              # Order, OrderItem
    │   │   └── payment.py            # Payment
    │   ├── routes/                    # Flask blueprints (API endpoints)
    │   │   ├── auth.py               # Registration, login, email verification
    │   │   ├── animals.py            # Animal listing CRUD
    │   │   ├── cart.py               # Cart management
    │   │   ├── orders.py             # Checkout & order lifecycle
    │   │   ├── payments.py           # Payment initiation & webhooks
    │   │   └── reference.py          # Animal types & breeds
    │   ├── middleware/
    │   │   ├── auth_middleware.py     # JWT decorators
    │   │   └── role_middleware.py     # RBAC enforcement
    │   ├── services/
    │   │   ├── email_service.py       # SendGrid email dispatch
    │   │   ├── image_service.py       # Cloudinary uploads with compensation
    │   │   └── payment_service.py     # Payment gateway abstraction
    │   ├── utils/
    │   │   ├── response.py            # JSON response helpers
    │   │   ├── validators.py          # Input validation helpers
    │   │   └── pagination.py          # Offset/limit pagination
    │   ├── extensions.py              # Flask extension instances
    │   ├── config.py                  # Dev / Test / Prod config classes
    │   ├── cli.py                     # Custom Flask CLI commands
    │   └── __init__.py                # Application factory (create_app)
    ├── migrations/                    # Alembic migration files
    ├── tests/
    │   ├── conftest.py               # pytest fixtures & factories
    │   ├── test_auth.py
    │   ├── test_animals.py
    │   ├── test_cart.py
    │   └── test_orders.py
    ├── run.py                         # App entry point
    ├── requirements.txt
    └── .env.example
```

---

## Features

### Buyer Features
- Browse all available animals on the marketplace
- Filter by animal type, breed, age range, and price range
- Full-text search by name or description
- View detailed animal pages with photo galleries and farmer contact info
- Add animals to a persistent shopping cart
- Checkout with delivery address capture
- Track order status (pending → confirmed → completed)
- View complete order history with price snapshots

### Farmer Features
- Create and manage animal listings with up to 5 images per listing
- Set price, weight, age, breed, and description
- Dashboard with listing statistics and overview
- View and manage incoming orders from buyers
- Confirm or reject orders (animals auto-transition through `available → reserved → sold`)

### Platform Features
- Two-step email verification on registration
- Password reset via email link
- JWT-based session management with automatic restoration on page reload
- Role-based access control (farmer / buyer / admin)
- Cloudinary image CDN with automatic resizing
- Payment gateway integration (M-PESA and card-ready)
- HMAC-verified payment webhooks
- Transactional email via SendGrid
- Versioned REST API (`/api/v1`)
- CORS-enabled for cross-origin frontend

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Node.js | 18+ |
| pnpm | 8+ |
| Python | 3.12+ |
| PostgreSQL | 14+ (or a Supabase project) |

### Backend Setup

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# .venv\Scripts\activate         # Windows

# 3. Install dependencies
pip install -r requirements.txt

# 4. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your database URL, Cloudinary keys, SendGrid key, etc.

# 5. Run database migrations
flask db upgrade

# 6. Start the development server
python run.py
# API runs at http://localhost:5000
```

### Frontend Setup

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Set VITE_API_URL to your backend URL

# 4. Start the development server
pnpm dev
# App runs at http://localhost:5173
```

---

## Environment Variables

### Frontend (`frontend/.env`)

```env
VITE_API_URL=http://localhost:5000/api/v1
```

### Backend (`backend/.env`)

```env
# Flask
FLASK_ENV=development
SECRET_KEY=<32+ random characters>
JWT_SECRET_KEY=<32+ random characters>

# Database — use pooler URL (port 6543) for the app
DATABASE_URL=postgresql://user:password@host:6543/farmart?sslmode=require

# Migrations — use direct URL (port 5432) to avoid transaction conflicts
MIGRATION_DATABASE_URL=postgresql://user:password@host:5432/farmart?sslmode=require

# Cloudinary — for image storage and CDN
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# SendGrid — for transactional email
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@farmart.co.ke

# CORS — your frontend origin
FRONTEND_URL=http://localhost:5173
```

---

## API Reference

All endpoints are prefixed with `/api/v1`.

### Authentication — `/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register a new farmer or buyer account |
| POST | `/auth/login` | Public | Log in and receive a JWT access token |
| POST | `/auth/logout` | JWT | Invalidate the current session |
| GET | `/auth/me` | JWT | Get the authenticated user's profile |
| POST | `/auth/verify-email` | Public | Confirm email with a verification token |
| POST | `/auth/resend-verification` | Public | Resend the email verification link |
| POST | `/auth/forgot-password` | Public | Request a password reset email |
| POST | `/auth/reset-password` | Public | Set a new password using the reset token |

### Animals — `/animals`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/animals` | Public | List available animals (filterable, paginated) |
| GET | `/animals/:id` | Public | Get a single animal's details |
| POST | `/animals` | Farmer | Create a new listing (multipart: fields + images) |
| PATCH | `/animals/:id` | Farmer (owner) | Update listing details |
| DELETE | `/animals/:id` | Farmer (owner) | Delete a listing |
| POST | `/animals/:id/images` | Farmer (owner) | Add images to a listing |
| DELETE | `/animals/:id/images/:image_id` | Farmer (owner) | Remove a specific image |

**Query Parameters for `GET /animals`:**

| Param | Type | Description |
|---|---|---|
| `type` | string | Filter by animal type (e.g. `cattle`, `goat`) |
| `breed` | string | Filter by breed |
| `min_age` | integer | Minimum age in months |
| `max_age` | integer | Maximum age in months |
| `min_price` | number | Minimum price |
| `max_price` | number | Maximum price |
| `search` | string | Full-text search on name/description |
| `farmer_id` | integer | Filter by specific farmer |
| `status` | string | Filter by status (`available`, `reserved`, `sold`) |
| `page` | integer | Page number (default: 1) |
| `per_page` | integer | Items per page (default: 20) |

### Reference Data

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/animal-types` | Public | List all animal types |
| POST | `/animal-types` | Admin | Create a new animal type |
| GET | `/breeds` | Public | List breeds, filterable by `?animal_type_id=` |

### Cart — `/cart`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/cart` | Buyer | View cart (validates item availability) |
| POST | `/cart/items` | Buyer | Add an animal to the cart |
| DELETE | `/cart/items/:animal_id` | Buyer | Remove an item from the cart |
| DELETE | `/cart` | Buyer | Clear the entire cart |

### Orders — `/orders` and `/farmer/orders`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/orders` | Buyer | Checkout: atomically reserves animals, creates order, clears cart |
| GET | `/orders` | Buyer | List the buyer's orders (paginated) |
| GET | `/orders/:id` | Buyer | Get order details |
| GET | `/farmer/orders` | Farmer | List incoming orders for the farmer's animals |
| GET | `/farmer/orders/:id` | Farmer | Get a specific order detail |
| PATCH | `/farmer/orders/:id/confirm` | Farmer | Accept an order (animals → sold) |
| PATCH | `/farmer/orders/:id/reject` | Farmer | Decline an order (animals → available) |

### Payments — `/payments`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/payments/initiate` | Buyer | Start a payment flow for an order |
| POST | `/payments/webhook` | Server | Payment gateway callback (HMAC-verified) |
| GET | `/payments/:order_id` | Buyer | Get the payment status for an order |

### Health Check

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Returns `200 OK` when the server is running |

---

## Database Schema

```
users
  id, email (unique), password_hash, role (farmer|buyer|admin),
  first_name, last_name, phone_number (unique), is_verified, is_active,
  created_at, updated_at

farmer_profiles               (1-to-1 with users where role=farmer)
  id, user_id (FK), farm_name, farm_location, bio

buyer_profiles                (1-to-1 with users where role=buyer)
  id, user_id (FK), default_delivery_address

verification_tokens
  id, user_id (FK), token (unique), token_type (verify_email|reset_password),
  expires_at, is_used, created_at

animal_types                  (reference data: Cattle, Goat, Sheep, etc.)
  id, name (unique), created_at

breeds
  id, animal_type_id (FK), name
  UNIQUE (animal_type_id, name)

animals
  id, farmer_id (FK), animal_type_id (FK), breed_id (FK),
  name, age_months, weight_kg, price, description,
  status (available|reserved|sold), created_at, updated_at

animal_images
  id, animal_id (FK), cloudinary_public_id, cloudinary_url, is_primary
  ORDER BY is_primary DESC

carts
  id, buyer_id (FK, unique — one cart per buyer), created_at

cart_items
  id, cart_id (FK), animal_id (FK)
  UNIQUE (cart_id, animal_id)

orders
  id, buyer_id (FK), total_amount, status (pending|confirmed|rejected|completed|cancelled),
  delivery_address, notes, created_at, updated_at

order_items                   (immutable financial records)
  id, order_id (FK), animal_id (FK, SET NULL on animal delete),
  price_at_purchase, animal_name_snapshot, animal_type_snapshot

payments
  id, order_id (FK, unique), amount, payment_method (mpesa|card),
  payment_status (pending|success|failed), transaction_ref,
  gateway_response (JSON), paid_at
```

---

## Authentication & Authorization

### JWT Flow

1. User registers and receives an email verification link.
2. User clicks the link — account becomes active (`is_verified = true`).
3. User logs in with email and password — receives a JWT access token (1-day expiry).
4. Frontend stores the token in `localStorage` under the key `farmart_token`.
5. Every protected request includes the header: `Authorization: Bearer <token>`.
6. On page load, the frontend calls `GET /auth/me` to restore session state.

### Role-Based Access Control

Middleware decorators enforce access at the route level:

| Decorator | Who can access |
|---|---|
| `@jwt_auth_required` | Any authenticated user |
| `@verified_user_required` | Authenticated + email verified |
| `@farmer_required` | Verified farmer only |
| `@buyer_required` | Verified buyer only |
| `@admin_required` | Admin only |

### Frontend Route Protection

React Router layouts enforce role-based access:

| Layout | Routes |
|---|---|
| Public | `/`, `/marketplace`, `/animals/:id` |
| Auth (unauthenticated) | `/login`, `/register`, `/verify-email` |
| Protected (buyer) | `/cart`, `/checkout`, `/my-orders`, `/payment-success` |
| Farmer Dashboard | `/farmer/dashboard`, `/farmer/listings/*`, `/farmer/orders` |

---

## Key Design Decisions

### Price Snapshot Pattern
Order items store `price_at_purchase`, `animal_name_snapshot`, and `animal_type_snapshot` at the time of checkout. If a farmer updates a price later, historical orders remain accurate — there are no silent price discrepancies in a buyer's order history.

### Atomic Checkout Transaction
The checkout endpoint runs inside a single database transaction:
1. Validate all cart items are still available.
2. Snapshot prices and create the order + order items.
3. Mark animals as `reserved`.
4. Clear the buyer's cart.

If any step fails, the transaction rolls back — no partial orders, no phantom reservations.

### Cloudinary Compensation Logic
Image uploads happen before the database record is created. If the route fails after the upload (e.g. a validation error), the service deletes the already-uploaded images from Cloudinary to prevent orphaned files. This keeps the two data layers consistent.

### Deferred Extension Initialization
Flask extensions (`db`, `jwt`, `cors`, `migrate`) are instantiated in `extensions.py` without an app instance, then bound in the `create_app` factory. Models safely import from `extensions.py` without triggering circular imports.

### Dual Database URLs
Supabase uses a connection pooler (port `6543`) for application queries and a direct connection (port `5432`) for migrations. Alembic requires the direct connection to avoid transaction-mode conflicts when running DDL statements.

---

## Testing

```bash
# Run all tests
cd backend
pytest

# Run with coverage report
pytest --cov=app --cov-report=term-missing

# Run a specific test file
pytest tests/test_auth.py -v
```

The test suite covers:
- `test_auth.py` — Registration, login, email verification, password reset
- `test_animals.py` — Listing CRUD, filter queries, image handling
- `test_cart.py` — Cart operations and availability checks
- `test_orders.py` — Checkout flow and order status lifecycle

Tests use an isolated `farmart_test` database with factory-boy fixtures. The test config skips real email sending and sets a 5-second JWT expiry for token-expiry tests.

---

## Deployment

### Frontend

```bash
cd frontend
pnpm build       # Outputs to dist/
```

Deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages). Set `VITE_API_URL` to your production backend URL as a build-time environment variable.

### Backend

```bash
# Production server with Gunicorn
gunicorn "run:app" --workers 4 --bind 0.0.0.0:5000
```

Run behind Nginx as a reverse proxy. Set `FLASK_ENV=production` — the production config validates that all required secrets are present and disables debug mode.

### Infrastructure

| Service | Provider |
|---|---|
| Database | Supabase (PostgreSQL) |
| Image storage & CDN | Cloudinary |
| Transactional email | SendGrid |
| Suggested frontend host | Vercel / Netlify |
| Suggested backend host | Railway / Render / VPS with Nginx |

---

## Contributing

1. Fork the repository and create a feature branch from `develop`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and ensure tests pass:
   ```bash
   pytest
   pnpm lint
   ```

3. Open a pull request against `develop` with a clear description of the change.

**Branch conventions:**
- `feature/` — new features
- `fix/` — bug fixes
- `chore/` — non-functional changes (deps, config)

---

## License

This project is part of a software engineering course (Phase 5 capstone). See the repository root for license details.
