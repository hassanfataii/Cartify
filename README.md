# Cartify V2

Cartify V2 is a full-stack ecommerce application built with React, Node.js, Express, MongoDB and Stripe.

It demonstrates a complete customer and admin workflow, from browsing products and managing a cart to authentication, checkout, order tracking, returns, transactional email and store administration.

## Live Demo

- **Live site:** https://frontend-snowy-five-f923hx8bc1.vercel.app
- **Repository:** https://github.com/hassanfataii/Cartify

## Demo Admin Account

To explore the admin features on the live application:

```text
Email: superadmin@cartify.com
Password: Cartify123
```

## Core Features

### Storefront

- Responsive ecommerce interface
- Product catalogue
- Product search
- Category filtering
- Product sorting
- Pagination
- Individual product pages
- Product stock tracking
- Unique product numbers
- Product images
- Toast feedback for user actions

### Authentication and Accounts

- Email and password registration
- Secure password hashing with bcrypt
- JWT authentication
- HTTP-only authentication cookies
- Google Sign-In
- Persistent session restoration
- Logout
- Protected customer routes
- Protected admin routes
- Account profile management
- Password management
- Saved customer addresses
- Role-based access control

### Cart

- Add products to cart
- Update quantities
- Remove individual items
- Clear the cart
- Stock-aware quantity validation
- Authenticated cart persistence
- Cart item count in the interface

### Wishlist

- Add products to wishlist
- Remove wishlist items
- Persistent wishlist state for authenticated users
- Wishlist page and product actions

### Checkout and Payments

- Stripe Checkout integration
- Server-side order creation
- Stripe webhook processing
- Payment status tracking
- Stock validation before fulfilment
- Stock deduction after successful payment
- Protection against duplicate webhook handling
- Cart cleanup after successful checkout
- Success and cancellation flows

### Orders

Customers can:

- View order history
- Search for orders by order number
- Sort orders by date
- View individual order details
- View purchased products and quantities
- View order totals
- Track order status
- View payment status
- Submit return requests for eligible orders

### Returns

The return workflow includes:

- Return eligibility checks
- Item-level return quantities
- Return reasons
- Optional customer notes
- Refund value calculation
- Prevention of returning more items than were purchased
- Prevention of duplicate or excessive return quantities
- Customer return history
- Admin return review
- Return approval
- Return rejection
- Marking approved returns as received
- Return status tracking

Supported return statuses include:

```text
requested
approved
rejected
received
refunded
completed
cancelled
```

### Admin Dashboard

The protected administration area includes:

- Dashboard overview
- Customer count
- Active product count
- Paid order count
- Revenue summary
- Low-stock overview
- Recent orders
- Product management
- Product creation
- Product editing
- Product image uploads
- Order management
- Order status updates
- Return management
- Return approval and rejection
- Return receipt tracking
- Responsive collapsible sidebar navigation

### Admin Notifications

The admin notification system supports:

- New order notifications
- New return request notifications
- Read and unread state
- Unread notification count
- Mark individual notifications as read
- Mark all notifications as read
- Direct links to the relevant admin section

### Transactional Email

Cartify uses Resend for transactional email.

Current email flows include:

- Welcome emails
- Order confirmation emails

Email handling is separated from the core account and order workflows so an email failure does not invalidate an otherwise successful operation.

## Tech Stack

### Frontend

- React
- React Router
- Vite
- JavaScript
- SCSS
- Context API
- Vitest
- React Testing Library
- ESLint

### Backend

- Node.js
- Express
- MongoDB
- MongoDB native driver
- Zod
- JSON Web Tokens
- bcryptjs
- Stripe
- Resend
- Cloudinary
- Multer
- Helmet
- CORS
- express-rate-limit
- Vitest
- Supertest

### Services and Deployment

- MongoDB Atlas
- Stripe
- Google OAuth
- Resend
- Cloudinary
- Vercel
- Render

## How It Works

### Authentication

Users can register with email and password or authenticate with Google.

The backend issues a JWT which is stored in an HTTP-only cookie. Protected routes verify the session on the server, while admin routes additionally check the user's role.

### Product Data

Products and categories are stored in MongoDB. Product records include stock information, pricing, images, category relationships and unique product numbers.

The customer storefront retrieves this data through the backend API and supports search, filtering, sorting and pagination.

### Cart and Wishlist

Authenticated users can maintain cart and wishlist state across sessions.

Cart operations are validated against product stock so customers cannot intentionally set quantities beyond available inventory.

### Checkout

Checkout is created on the backend and completed through Stripe Checkout.

When Stripe confirms payment through a verified webhook, the backend:

1. validates the order and payment data
2. validates and reduces product stock
3. marks the order as paid and processing
4. stores Stripe payment information
5. clears purchased products from the customer's cart
6. sends the order confirmation email
7. creates an admin notification for the new order

### Returns

Returns are available for eligible paid and delivered orders.

The backend checks how many units were purchased and how many are already reserved by existing return requests. This prevents a customer from returning more units than they originally bought.

New return requests are stored separately and surfaced in the admin area for review.

### Admin System

Admin access is controlled through the same authentication system using role-based authorization.

The admin interface allows store activity to be monitored and managed without exposing administrative endpoints to regular customer accounts.

## Technical Highlights

The project demonstrates practical experience with:

- Full-stack application development
- Component-based React architecture
- REST API design
- Client and server separation
- Authentication and authorization
- JWT authentication with HTTP-only cookies
- Role-based access control
- Google authentication
- React Context state management
- Protected frontend routes
- MongoDB data modelling
- ObjectId relationships
- Server-side validation with Zod
- Stripe Checkout
- Stripe webhook verification
- Idempotent and duplicate-safe workflows
- Inventory validation and stock updates
- Customer ownership checks
- Return quantity reservation
- Transactional email
- Image upload handling
- Error handling
- CORS and cookie configuration
- Rate limiting and security middleware
- Responsive UI development
- SCSS organisation
- Automated frontend and backend testing
- Production deployment
- Environment-based configuration

## Project Layout

The repository is split into two main applications:

```text
Cartify/
├── backend/
│   ├── scripts/
│   ├── src/
│   ├── test/
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

### Backend

The backend contains:

- API routes
- controllers
- authentication and admin middleware
- database configuration
- email logic
- services
- utility functions
- database seeding scripts
- tests

### Frontend

The frontend contains:

- API client modules
- reusable React components
- pages
- authentication, cart, wishlist and toast contexts
- customer and admin layouts
- SCSS styles
- tests

## Running Locally

Clone the repository:

```bash
git clone https://github.com/hassanfataii/Cartify.git
cd Cartify
```

Install the backend dependencies:

```bash
cd backend
npm install
```

Install the frontend dependencies:

```bash
cd ../frontend
npm install
```

Create the required frontend and backend environment files.

Example backend variables include:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=
JWT_SECRET=
FRONTEND_URL=http://localhost:5173
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
EMAIL_MODE=log
RESEND_API_KEY=
EMAIL_FROM=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Example frontend variables include:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=
```

Seed the database:

```bash
cd backend
npm run seed
```

Start the backend:

```bash
npm run dev
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

Local development defaults:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:5000
```

## Available Scripts

### Backend

```bash
npm run dev
npm start
npm test
npm run test:watch
npm run seed
npm run db:reset
npm run admin:promote
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm test
npm run test:watch
npm run preview
```

## Testing

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Backend:

```bash
cd backend
npm test
```

## Security

Cartify includes:

- bcrypt password hashing
- HTTP-only authentication cookies
- secure production cookie settings
- JWT verification
- role-based admin middleware
- Zod request validation
- Helmet
- CORS restrictions
- API rate limiting
- Stripe webhook signature verification
- customer ownership checks
- inventory validation
- environment-based secret management

No production secrets or credentials should be committed to the repository.

## Skills Highlighted

This project highlights experience across:

### Frontend Engineering

- React
- reusable component architecture
- routing
- client-side state management
- responsive design
- SCSS
- API integration
- form handling
- loading and error states
- frontend testing

### Backend Engineering

- Node.js
- Express
- REST APIs
- middleware
- validation
- authentication
- authorization
- MongoDB
- database queries and relationships
- webhook processing
- transactional workflows
- backend testing

### Integrations

- Stripe payments
- Google authentication
- Resend email
- Cloudinary image uploads
- MongoDB Atlas

### Software Engineering

- separation of concerns
- reusable modules
- error handling
- security-conscious authentication
- idempotent event handling
- testing
- Git and GitHub
- production deployment
- environment configuration

## Author

**Hassan Fatai**

- GitHub: https://github.com/hassanfataii
- Repository: https://github.com/hassanfataii/Cartify
- Live site: https://frontend-snowy-five-f923hx8bc1.vercel.app
