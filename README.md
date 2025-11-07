# E-Commerce Application

A complete e-commerce backend application with JWT authentication, product management, shopping cart, and payment integration.

## Features

- ✅ User Registration & Login with JWT
- ✅ Access Token & Refresh Token system
- ✅ Product browsing and search
- ✅ Shopping cart management
- ✅ Order creation and management
- ✅ Payment integration with Agent Payment System
- ✅ Webhook handling for payment confirmations

## Tech Stack

- **Node.js** + **Express** + **TypeScript**
- **Prisma** ORM with SQLite
- **JWT** for authentication
- **bcrypt** for password hashing

## Setup

### 1. Install Dependencies

```bash
cd ecommerce-app
npm install
```

### 2. Configure Environment

Edit `.env` file and set your payment API key:

```env
PAYMENT_API_KEY=your_api_key_from_admin_dashboard
```

### 3. Initialize Database

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 4. Seed Database

```bash
npm run seed
```

This creates:
- Test user: `test@example.com` / `password123`
- 10 sample products

### 5. Start Server

```bash
npm run dev
```

Server runs on: http://localhost:4000

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile (requires auth)

### Products

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `GET /api/products/search?q=query` - Search products

### Cart

- `GET /api/cart` - Get cart (requires auth)
- `POST /api/cart/add` - Add item to cart (requires auth)
- `PUT /api/cart/update/:productId` - Update cart item (requires auth)
- `DELETE /api/cart/remove/:productId` - Remove from cart (requires auth)
- `DELETE /api/cart/clear` - Clear cart (requires auth)

### Orders

- `POST /api/orders/create` - Create order from cart (requires auth)
- `POST /api/orders/initiate-payment/:orderId` - Initiate payment (requires auth)
- `GET /api/orders` - Get user orders (requires auth)
- `GET /api/orders/:id` - Get order by ID (requires auth)

### Webhook

- `POST /api/webhook/payment` - Payment webhook (called by payment system)

## Example Usage

### 1. Register User

```bash
POST http://localhost:4000/api/auth/register
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1234567890",
  "address": "456 Oak St",
  "city": "Los Angeles",
  "country": "USA",
  "zipCode": "90001"
}
```

### 2. Login

```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "customer@example.com",
  "password": "password123"
}
```

Response includes `accessToken` and `refreshToken`.

### 3. Browse Products

```bash
GET http://localhost:4000/api/products
```

### 4. Add to Cart

```bash
POST http://localhost:4000/api/cart/add
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "productId": "product-id-here",
  "quantity": 2
}
```

### 5. Create Order

```bash
POST http://localhost:4000/api/orders/create
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "shippingAddress": "456 Oak St",
  "shippingCity": "Los Angeles",
  "shippingCountry": "USA",
  "shippingZipCode": "90001",
  "notes": "Please deliver between 2-5 PM"
}
```

### 6. Initiate Payment (PAYER Button!)

```bash
POST http://localhost:4000/api/orders/initiate-payment/:orderId
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json

{
  "paymentType": "MOBILE_MONEY"
}
```

Response includes `redirect_url` - redirect user to this URL to complete payment!

## Payment Flow

1. User adds items to cart
2. User creates order from cart
3. User clicks "PAYER" (Pay) button
4. Frontend calls `/api/orders/initiate-payment/:orderId`
5. Backend calls Payment System API
6. User is redirected to Payment System form
7. User uploads payment proof
8. Agent approves/rejects payment
9. Payment System sends webhook to `/api/webhook/payment`
10. Order status updated to PAID or CANCELLED

## Database Schema

- **User** - Customer accounts
- **RefreshToken** - JWT refresh tokens
- **Product** - Products for sale
- **Cart** - User shopping carts
- **CartItem** - Items in cart
- **Order** - Customer orders
- **OrderItem** - Items in order

## Testing

Test user credentials:
- Email: `test@example.com`
- Password: `password123`

## Production Deployment

1. Change database to PostgreSQL/MySQL in `schema.prisma`
2. Set strong JWT secrets in `.env`
3. Update CORS settings in `server.ts`
4. Set production API URLs
5. Use HTTPS for all endpoints
6. Implement rate limiting
7. Add request validation
8. Set up logging and monitoring

## License

MIT
