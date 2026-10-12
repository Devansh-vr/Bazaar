# Bazaar

A full-stack e-commerce marketplace where customers can browse products, authenticate, maintain persistent carts/wishlists, leave reviews, pay through Razorpay, and track orders. Admins manage products and orders through a dashboard.

**Status: feature-complete.** Authentication, product catalog, cart, wishlist, reviews/ratings, checkout, Razorpay payments, orders, and the admin dashboard are all implemented end-to-end.

## Tech Stack

**Frontend**
- React 19 (JavaScript)
- Vite
- React Router v7
- Axios
- React Context API
- Custom CSS (dark, glassmorphism design system)

**Backend**
- Node.js + Express.js (ES Modules)
- MongoDB + Mongoose
- JWT authentication (short-lived access token + long-lived refresh token)
- bcrypt
- Razorpay (server-side order creation + signature verification)
- Role-based authorization
- Helmet, CORS

**Database**
MongoDB is the persistent source of truth for users, products, carts, wishlists, orders, and reviews. Nothing uses localStorage as a database substitute — the access token is kept in memory on the frontend (not localStorage), and session persistence comes from the HttpOnly refresh-token cookie.

## Architecture

- Monorepo-style layout: `backend/` and `frontend/` are independently runnable projects.
- All backend APIs are versioned under `/api/v1/`.
- Authentication: a short-lived JWT access token (sent as `Authorization: Bearer <token>`, kept in memory on the frontend) plus a long-lived refresh token in an HttpOnly, `sameSite=lax` cookie scoped to `/api/v1/user`. Refresh tokens are rotated on use and stored server-side as SHA-256 hashes (never plain text), supporting per-session revocation across multiple devices.
- Checkout/payments: the cart is snapshotted into a `Pending` order (product title/price/image copied at checkout time; total computed server-side — the frontend never supplies a price). A Razorpay order is created using the backend secret key only; the public key id is the only thing returned to the frontend. Payment signatures are verified server-side via HMAC-SHA256, and only a verified signature triggers stock decrement (atomic, with rollback if stock runs out) and cart clearing. Verification is guarded against double-processing via an atomic conditional update.
- Backend logic is separated into `models/`, `controllers/`, `routes/`, `middleware/`, and `utils/` — nothing is dumped into `server.js`.
- Frontend logic is separated into `pages/`, `components/` (including `components/admin/` for dashboard pieces), `context/`, and `services/` — nothing is dumped into `App.jsx`.

## Folder Structure

```
project/
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env.example
│   ├── database/
│   │   └── db.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── productModel.js
│   │   ├── cartModel.js
│   │   ├── wishlistModel.js
│   │   ├── orderModel.js
│   │   └── reviewModel.js
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── productController.js
│   │   ├── cartController.js
│   │   ├── wishlistController.js
│   │   ├── orderController.js
│   │   ├── paymentController.js
│   │   ├── reviewController.js
│   │   └── adminController.js
│   ├── routes/
│   ├── middleware/
│   │   ├── authMiddleware.js
│   │   └── roleMiddleware.js
│   └── utils/
│       ├── errorHandler.js
│       ├── asyncHandler.js
│       ├── tokenUtils.js
│       ├── validators.js
│       └── razorpayClient.js
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── api.js
│       ├── pages/
│       │   ├── HomePage.jsx        (product catalog: search/filter/sort/pagination)
│       │   ├── ProductDetails.jsx  (details, add to cart, wishlist, reviews)
│       │   ├── Login.jsx / Register.jsx / Profile.jsx
│       │   ├── CartPage.jsx / CheckoutPage.jsx
│       │   ├── OrdersPage.jsx / OrderDetails.jsx
│       │   ├── WishlistPage.jsx
│       │   └── Admin.jsx           (dashboard shell: overview/products/orders tabs)
│       ├── components/
│       │   ├── Navbar.jsx / ProtectedRoute.jsx / AdminRoute.jsx / Loading.jsx
│       │   ├── ProductCard.jsx / ReviewSection.jsx
│       │   └── admin/
│       │       ├── AdminStats.jsx
│       │       ├── AdminProducts.jsx
│       │       └── AdminOrders.jsx
│       ├── context/
│       │   ├── AuthContext.jsx / CartContext.jsx / WishlistContext.jsx
│       ├── services/
│       │   ├── authService.js / tokenStore.js
│       │   ├── productService.js / cartService.js / wishlistService.js
│       │   ├── orderService.js / paymentService.js / adminService.js
│       │   └── razorpayLoader.js
│       └── styles/
│           └── global.css
│
├── .gitignore
└── README.md
```

## API Overview

All routes are prefixed with `/api/v1`.

| Area | Routes |
|---|---|
| Health | `GET /health` |
| Auth | `POST /user/register`, `POST /user/login`, `POST /user/refresh`, `POST /user/logout`, `GET /user/me` |
| Products | `GET /products` (search/filter/sort/pagination), `GET /products/filters`, `GET /products/:id`, `POST /products` (admin), `PUT /products/:id` (admin), `DELETE /products/:id` (admin) |
| Reviews | `GET /products/:id/reviews`, `POST /products/:id/reviews` (auth, upserts caller's own review), `DELETE /products/:id/reviews` (auth, own review) |
| Cart | `GET/POST/DELETE /cart`, `PUT/DELETE /cart/:productId` (all require auth) |
| Wishlist | `GET/POST /wishlist`, `DELETE /wishlist/:productId`, `GET /wishlist/:productId/check` (all require auth) |
| Orders | `POST /orders` (checkout), `GET /orders/my-orders`, `GET /orders/:id` (owner or admin), `GET /orders` (admin, all orders), `PUT /orders/:id/status` (admin) |
| Payments | `POST /payments/create-order`, `POST /payments/verify` |
| Admin | `GET /admin/stats` (admin) |

## Environment Setup

Copy the example env file and fill in real values:

```bash
cd backend
cp .env.example .env
```

Required backend environment variables:

| Variable | Description |
|---|---|
| `PORT` | Port the Express server listens on (default `5000`) |
| `NODE_ENV` | `development` or `production` — affects cookie `secure` flag and error verbosity |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | Secret used to sign short-lived access tokens |
| `JWT_REFRESH_SECRET` | Secret used to sign long-lived refresh tokens (must differ from the access secret) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default `7d`) |
| `FRONTEND_URL` | Origin allowed by CORS (e.g. `http://localhost:5173`) |
| `RAZORPAY_KEY_ID` | Razorpay key ID — required for checkout to work |
| `RAZORPAY_KEY_SECRET` | Razorpay key secret — required for checkout to work, **never sent to the frontend** |

Generate strong random values for the two JWT secrets, e.g. run this twice (once for each secret — they must differ):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Get Razorpay **test-mode** keys from https://dashboard.razorpay.com/ (Settings → API Keys). Without real keys, everything up through order creation works, but `/payments/create-order` returns a clear "Razorpay is not configured" error rather than failing silently.

The frontend reads its API base URL from `frontend/.env`:

```bash
cd frontend
cp .env.example .env
```

| Variable | Description |
|---|---|
| `VITE_API_BASE_URL` | Base URL of the backend API (default `http://localhost:5000/api/v1`) |

**Never commit a real `.env` file** — both are already listed in `.gitignore`. Only `.env.example` (placeholders only) is meant to be checked in or shared.

## MongoDB Setup

You need a running MongoDB instance — either local or a cloud cluster (e.g. MongoDB Atlas free/M0 tier). Point `MONGODB_URI` at it. The backend fails gracefully (logs the error and exits) rather than starting in a broken state if it can't connect.

Local example:
```
MONGODB_URI=mongodb://localhost:27017/bazaar
```

Atlas example:
```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/bazaar?retryWrites=true&w=majority
```

## Installation

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Running the App

**Backend** (from `backend/`):
```bash
npm run dev     # nodemon, auto-restarts on change
# or
npm start       # plain node
```
Backend runs at: `http://localhost:5000`

**Frontend** (from `frontend/`):
```bash
npm run dev
```
Frontend runs at: `http://localhost:5173`

Open `http://localhost:5173`, register an account, and browse. To reach the admin dashboard (`/admin`), the account's `role` field needs to be `Admin` in MongoDB — there's no self-service "become admin" flow by design. Easiest way to promote an account: open the `users` collection (via MongoDB Compass, Atlas's Data Explorer, or `mongosh`) and change that user's `role` field from `"Customer"` to `"Admin"`.

## Feature Summary

- **Auth**: register/login/logout, short-lived access token + rotating HttpOnly refresh token, silent session restore on page load, automatic refresh-and-retry on an expired token.
- **Catalog**: search by title, filter by category/brand, sort by price/rating/newest, pagination.
- **Cart & Wishlist**: MongoDB-backed per user, stock-validated quantities, loading/empty/error states.
- **Reviews**: one review (rating 1-5 + optional comment) per user per product; submitting again updates it. Product `averageRating`/`totalRatings` recompute automatically.
- **Checkout & Razorpay**: server-computed totals, stock re-validation at checkout, Razorpay order creation and signature verification, safe/atomic stock decrement and cart clearing only after a verified payment.
- **Orders**: order history, order detail with item snapshots and status, admin status updates.
- **Admin dashboard** (`/admin`, role-gated): overview stats (revenue, order/product/user counts, low-stock count, order-status breakdown), full product CRUD, and an all-orders table with inline status updates.

## Known Limitations

- No file upload for product images — the admin form takes comma-separated image URLs.
- No automated test suite ships with the project (verification during development used a temporary in-memory harness against the real controllers/routes, since no live MongoDB or Razorpay network access was available in that environment — this was not shipped as part of the app).
- Reviews aren't restricted to verified purchasers — any authenticated user can review any product.
- No password reset / email verification flow.
