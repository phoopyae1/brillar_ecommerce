# Brillar E-commerce Monorepo

## Requirements Confirmation
This implementation includes:
- Next.js App Router with TypeScript and MUI for the UI.
- Express + PostgreSQL using Prisma ORM and Zod validation.
- JWT auth (access + refresh tokens), request logging, centralized error handling.
- Product catalog, inventory management with movements, cart + checkout, orders, and admin dashboard.
- Docker Compose for local development, Prisma migrations, and seed data.

## Step-by-step Setup
### Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start Postgres and services:
   ```bash
   docker compose up
   ```
3. Run Prisma migrations and seed data:
   ```bash
   npm run db:migrate --workspace apps/api
   npm run db:seed --workspace apps/api
   ```
4. Start the app locally (if not using Docker for web/api):
   ```bash
   npm run dev
   ```

### Production
1. Set environment variables (see `apps/api/.env.example` and `apps/web/.env.example`).
2. Build packages:
   ```bash
   npm run build
   ```
3. Start API and Web servers with process manager or container orchestration.

## Database Schema (Prisma)
See `apps/api/prisma/schema.prisma` for full schema. Key tables:
- `users`, `refresh_tokens`
- `products`, `product_variants`
- `inventory`, `inventory_movements`
- `carts`, `cart_items`
- `orders`, `order_items`

## API Endpoints (REST)
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`

### Products
- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (ADMIN)
- `PUT /api/products/:id` (ADMIN)
- `DELETE /api/products/:id` (ADMIN)

### Inventory
- `GET /api/inventory` (ADMIN)
- `GET /api/inventory/:id/movements` (ADMIN)
- `POST /api/inventory/adjust` (ADMIN)
- `POST /api/inventory/reserve`
- `POST /api/inventory/release`
- `POST /api/inventory/consume`

### Cart & Orders
- `GET /api/cart`
- `POST /api/cart/items`
- `DELETE /api/cart/items/:id`
- `POST /api/cart/merge`
- `POST /api/orders/checkout`
- `GET /api/orders`
- `GET /api/orders/:id`

### Admin
- `GET /api/orders/admin/all`
- `PATCH /api/orders/admin/:id/status`
- `GET /api/admin/metrics`

#### Example: Reserve Inventory
```json
POST /api/inventory/reserve
{
  "inventoryId": "uuid",
  "quantity": 2,
  "reference": "cart:123"
}
```

## Frontend Pages & Components
- `/` Home page with featured products
- `/products` Product listing with filters
- `/products/[slug]` Product details
- `/cart` Cart view
- `/checkout` Checkout flow
- `/account/orders` Order history
- `/admin` Dashboard overview
- `/admin/products` Products CRUD (MUI DataGrid)
- `/admin/inventory` Inventory management (MUI DataGrid)
- `/admin/orders` Order management (MUI DataGrid)

UI components are in `apps/web/src/components` (e.g., `Header`, `ProductCard`, `AdminLayout`).

## Inventory Flow & Edge Cases
- `quantity_available = quantity_on_hand - quantity_reserved`.
- Add to cart: reserve inventory (movement type `RESERVE`).
- Checkout: consume inventory (movement type `OUT`), reduces on-hand and reserved.
- Cancel/refund: adjust on-hand up and log movement (movement type `IN`).
- Overselling is prevented by enforcing availability checks in transactions.

## API Documentation
OpenAPI docs are served at `/docs` in the API service.
