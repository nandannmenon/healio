# Healio API Server

A Node.js RESTful API for user, admin, product, cart, order, payment, address, and OTP management. Built with Express, Sequelize, and MySQL.

---

## Features

- **JWT Authentication**: Secure authentication for users and admins using JSON Web Tokens (JWT).
- **Nodemailer Integration**: Email-based OTP delivery for registration and password reset using nodemailer and Gmail.
- **Password Hashing**: User and admin passwords are securely hashed using bcrypt.
- **Session Management**: Uses express-session for session handling.
- **Environment Configuration**: dotenv for managing environment variables.
- **Sequelize ORM**: Database models and queries are managed with Sequelize ORM.
- **MySQL Database**: Data is stored in a MySQL database (configurable for other SQL dialects).
- **Input Validation**: All user input is validated using validatorjs and custom validation logic.
- **Pagination**: Built-in pagination for listing resources (products, users, orders, etc.).
- **Role-Based Access Control**: Middleware for user, admin, and superadmin roles.
- **User Registration & Authentication**: Register, login, OTP verification, password management.
- **Admin Authentication & Management**: Admin and superadmin login, admin registration, admin profile management, admin user/product/order/address management.
- **Product Catalog**: Public and authenticated endpoints for listing, viewing, creating, updating, and deleting products.
- **Shopping Cart**: Add to cart, view cart, update/remove items, checkout.
- **Order Management**: Place orders, view order history, admin can manage all orders and place orders for users.
- **Payment Processing**: Process and view payments for orders.
- **Address Management**: Add, update, delete, and view addresses for users and admins.
- **OTP Services**: Send, verify, reset password, get status/history, clear OTPs.
- **Health Check**: `/health` endpoint for uptime and status.

---

## Getting Started

### Prerequisites
- Node.js (v14+ recommended)
- MySQL database

### Installation
1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd healio-cp2
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables:
   - Copy `.env.example` to `.env` and fill in your database and secret values.
4. Run database migrations (if any):
   ```bash
   # Example (if using sequelize-cli)
   npx sequelize-cli db:migrate
   ```
5. Start the server:
   ```bash
   npm start
   # or for development
   npm run dev
   ```

---

## API Endpoints

### Public Endpoints
- `POST   /auth/register` — Register a new user
- `POST   /auth/verify-otp` — Verify registration OTP
- `POST   /auth/set-password` — Set password after OTP verification
- `POST   /auth/login` — User login
- `POST   /admin/login` — Admin login
- `POST   /otp/send` — Send OTP
- `POST   /otp/verify` — Verify OTP
- `POST   /otp/reset_password` — Reset password via OTP
- `GET    /otp/status/:userId` — Get OTP status for user
- `GET    /otp/history/:userId` — Get OTP history for user
- `DELETE /otp/clear/:userId` — Clear OTPs for user
- `GET    /products` — List all products (public)
- `GET    /products/:id` — Get product details (public)
- `GET    /health` — Health check

### User Endpoints (require authentication)
- `POST   /auth/logout` — Logout user
- `GET    /user/profile` — Get user profile
- `PUT    /user/profile` — Update user profile
- `POST   /user/addresses` — Add address
- `GET    /user/addresses` — List addresses
- `GET    /user/addresses/:id` — Get address by ID
- `PUT    /user/addresses/:id` — Update address
- `DELETE /user/addresses/:id` — Delete address
- `POST   /user/products/:id/add-to-cart` — Add product to cart
- `GET    /user/cart` — View cart
- `DELETE /user/cart/:id` — Remove item from cart
- `PUT    /user/cart/:id` — Update cart item
- `POST   /user/cart/checkout` — Checkout cart
- `GET    /user/orders` — List user orders
- `GET    /user/orders/:id` — Get order details
- `POST   /user/payments` — Process payment
- `GET    /user/payments` — List payments
- `GET    /user/payments/:id` — Get payment details

### Admin Endpoints (require admin or superadmin authentication)
- `GET    /admin/profile` — Get admin profile
- `PUT    /admin/profile` — Update admin profile
- `POST   /admin/register` — Register new admin (superadmin only)
- `GET    /admin` — List all admins (superadmin only)
- `GET    /admins/:id` — Get admin by ID (superadmin only)
- `PUT    /admin/:id/status` — Set admin status (superadmin only)
- `DELETE /admin/:id` — Remove admin (superadmin only)
- `GET    /admin/addresses` — List all addresses
- `POST   /admin/addresses` — Add address for user
- `GET    /admin/addresses/:id` — Get addresses by user ID
- `GET    /admin/addresses/detail/:id` — Get address by address ID
- `PUT    /admin/addresses/:id` — Update address
- `DELETE /admin/addresses/:id` — Delete address
- `GET    /admin/users` — List all users
- `GET    /admin/users/:id` — Get user by ID
- `POST   /admin/users` — Add user
- `PUT    /admin/users/:id` — Update user
- `PUT    /admin/users/:id/status` — Set user status
- `DELETE /admin/users/:id` — Remove user
- `GET    /admin/users/:id/orders` — Get orders for user
- `POST   /admin/products` — Add product
- `PUT    /admin/products/:id` — Update product
- `DELETE /admin/products/:id` — Remove product
- `PUT    /admin/products/:id/stock` — Update product stock
- `GET    /admin/products` — List all products
- `GET    /admin/products/:id` — Get product by ID
- `GET    /admin/orders` — List all orders
- `PUT    /admin/orders/:id/status` — Set order status
- `GET    /admin/orders/payments` — List order payments
- `POST   /admin/orders/place_for_user` — Place order for user
- `GET    /admin/orders/:id` — Get order by ID
- `GET    /admin/:id` — Get admin by ID (superadmin only)
- `PUT    /admin/:id` — Update admin (superadmin only)

---

## Project Structure

The project is organized as follows:

- `controllers/` — Contains the business logic for each resource. Divided into `admin/` and `user/` subfolders for admin- and user-specific logic (e.g., authentication, product, order, address controllers).
- `models/` — Sequelize models defining the database schema for entities like User, Product, Order, Cart, Address, etc.
- `routes/` — API route definitions. Main entry points are `userRoutes.js` and `adminRoutes.js`, which are combined in `index.js`.
- `middlewares/` — Custom Express middleware for authentication (JWT), role-based access, and error handling.
- `helper/` — Utility/helper functions for OTP, validation, pagination, and access control.
- `config/` — Application and database configuration files, including environment-specific settings and database connection logic.
- `migrations/` — Database migration scripts for evolving the schema over time.
- `server.js` — Main entry point that initializes the Express app, sets up middleware, connects to the database, and starts the server.
- `package.json` — Project metadata and dependencies.
- `.env` — Environment variables (not committed to version control).