# Metriq - Shopify Multi-Store Analytics Platform

> **Live Demo**: [metriq.shank50.live](https://metriq.shank50.live)

A comprehensive e-commerce analytics platform designed for Shopify merchants managing multiple stores. Metriq provides real-time insights into sales performance, inventory health, customer behavior, and abandoned cart analytics through an intuitive dashboard interface.

## 🚀 Key Features

- **Multi-Store Management**: Connect and monitor unlimited Shopify stores from a single dashboard
- **Real-Time Analytics**: Track revenue, orders, conversion rates, and customer metrics
- **Inventory Intelligence**: Monitor stock levels with out-of-stock and low-stock alerts
- **Customer Insights**: Identify top customers and analyze spending patterns
- **Abandoned Cart Recovery**: Track and analyze abandoned checkouts to recover lost revenue
- **Product Performance**: Real-time visibility into best-selling products and revenue attribution
- **Secure Authentication**: JWT-based authentication with role isolation per user

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Dashboard                          │
│                      (Vite + React Router)                       │
│              Charts, Tables, Multi-Store Switcher               │
└───────────────────────────┬─────────────────────────────────────┘
                            │ RESTful API calls (/api/*)
                            │ JWT Bearer Authentication
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                       Express.js Backend                          │
│    ┌──────────────┬──────────────┬─────────────┬──────────────┐  │
│    │ Auth         │ Stores       │ Dashboard   │ Ingestion    │  │
│    │ Controller   │ Management   │ Analytics   │ Service      │  │
│    └──────────────┴──────────────┴─────────────┴──────┬───────┘  │
│                                                        │          │
└────────────────────────────────────────────────────────┼──────────┘
                                                         │
                    ┌────────────────────────────────────┼────────────┐
                    │                                    │            │
                    ▼                                    ▼            │
          ┌──────────────────┐              ┌────────────────────┐   │
          │  Prisma ORM      │              │  Shopify Admin API │   │
          │  (PostgreSQL)    │              │  REST Integration  │   │
          │                  │              │                    │   │
          │ • Users          │              │ • Products         │   │
          │ • Tenants        │◄─────sync────│ • Orders           │   │
          │ • Products       │              │ • Customers        │   │
          │ • Orders         │              │ • Abandoned Carts  │   │
          │ • Customers      │              └────────────────────┘   │
          └──────────────────┘                                       │
                                                                     │
                              Neon PostgreSQL                        │
                         (Serverless Database)                       │
                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**:
- React 18 with React Router for SPA navigation
- Vite for build tooling and HMR
- Recharts for data visualization
- Axios for API communication
- Tailwind-inspired custom CSS

**Backend**:
- Node.js 18+ with Express.js
- Prisma ORM for database management
- JWT for stateless authentication
- Shopify Admin API integration
- Neon PostgreSQL (serverless)

## 📁 Project Structure

```
metriq/
├── frontend/                    # React dashboard application
│   ├── src/
│   │   ├── pages/              # Dashboard, Stores, Login pages
│   │   ├── components/         # Reusable UI components
│   │   ├── api.js              # Axios instance with auth interceptor
│   │   └── main.jsx            # Application entry point
│   └── vite.config.js          # Vite configuration with API proxy
│
├── server/                      # Express.js backend
│   ├── src/
│   │   ├── controllers/        # Business logic handlers
│   │   │   ├── authController.js
│   │   │   ├── dashboardController.js
│   │   │   ├── storeController.js
│   │   │   ├── ingestionController.js
│   │   │   └── inventoryController.js
│   │   ├── routes/             # API route definitions
│   │   ├── middleware/         # Auth middleware, error handlers
│   │   ├── services/           # Shopify API client
│   │   └── lib/                # Prisma client configuration
│   └── prisma/
│       └── schema.prisma       # Database schema definition
│
└── README.md
```

## 🛠️ Setup Instructions

### Prerequisites

- **Node.js** 18 or higher
- **PostgreSQL** database (or Neon account)
- **Shopify** store(s) with Admin API access

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/shank50/metriq.git
cd metriq

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Configuration

Create `server/.env` with your database and JWT configuration:

```env
# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# JWT Secret (generate a random 64-character string)
JWT_SECRET="your-super-secret-jwt-key-replace-this"

# Server Port (optional, defaults to 4123)
PORT=4123
```

**Important**: For Neon PostgreSQL connections, ensure your DATABASE_URL does NOT include `channel_binding=require` parameter when using pooler endpoints.

### 3. Database Setup

```bash
cd server

# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with sample data
npm run seed
```

### 4. Start Development Servers

**Terminal 1 - Backend**:
```bash
cd server
npm run dev
# Backend running on http://localhost:4123
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
# Frontend running on http://localhost:3123
```

### 5. Access the Application

1. Navigate to `http://localhost:3123`
2. Create an account via the registration page
3. Add your Shopify store(s) with domain and access token
4. Sync data to start viewing analytics

## 🔌 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Create new user account | No |
| POST | `/api/auth/login` | Authenticate and receive JWT token | No |

### Store Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/stores/list` | List all stores connected to user | Yes |
| POST | `/api/stores/add` | Add new Shopify store connection | Yes |
| PUT | `/api/stores/:storeId` | Update store credentials or settings | Yes |
| DELETE | `/api/stores/:storeId` | Remove store and associated data | Yes |

### Data Synchronization

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/ingestion/sync` | Sync data for a specific store | Yes |
| POST | `/api/ingestion/sync-all` | Sync all stores for the user | Yes |

**Request Body** (for `/api/ingestion/sync`):
```json
{
  "storeId": "tenant-uuid"
}
```

### Dashboard Analytics

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/api/dashboard/stats` | Key metrics (revenue, orders, customers, conversion) | `?storeId=<uuid>` |
| GET | `/api/dashboard/sales` | Sales time-series data | `?range=30d&storeId=<uuid>` |
| GET | `/api/dashboard/customers/top` | Top customers by spend | `?storeId=<uuid>` |
| GET | `/api/dashboard/products/top` | Best-selling products | `?storeId=<uuid>` |
| GET | `/api/dashboard/orders/recent` | Recent orders list | `?storeId=<uuid>` |
| GET | `/api/dashboard/abandoned/stats` | Abandoned cart metrics | `?storeId=<uuid>` |

### Inventory Management

| Method | Endpoint | Description | Query Params |
|--------|----------|-------------|--------------|
| GET | `/api/inventory/status` | Inventory health (out of stock, low stock) | `?storeId=<uuid>` |

**Authentication**: All protected endpoints require `Authorization: Bearer <token>` header.

**Response Format**:
```json
{
  "data": { ... },
  "error": null
}
```

## 📊 Database Schema

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────────────┐
│     User     │         │       Tenant         │
│──────────────│         │──────────────────────│
│ id (PK)      │────────<│ id (PK)              │
│ email (UQ)   │ 1    * │ userId (FK)          │
│ password     │         │ shopifyDomain        │
│ name         │         │ storeName            │
│ createdAt    │         │ accessToken          │
└──────────────┘         │ createdAt, updatedAt │
                         └──────────┬───────────┘
                                    │
                          ┌─────────┴─────────┬──────────────┬──────────────┐
                          │                   │              │              │
                          ▼                   ▼              ▼              ▼
                  ┌──────────────┐   ┌───────────┐  ┌──────────┐  ┌─────────────────┐
                  │   Product    │   │  Customer │  │  Order   │  │ AbandonedCheckout│
                  │──────────────│   │───────────│  │──────────│  │─────────────────│
                  │ id (PK)      │   │ id (PK)   │  │ id (PK)  │  │ id (PK)         │
                  │ shopifyId    │   │ shopifyId │  │ shopifyId│  │ shopifyId       │
                  │ tenantId(FK) │   │ tenantId  │  │ tenantId │  │ tenantId (FK)   │
                  │ title        │   │ email     │  │ customerId  │ email           │
                  │ vendor       │   │ totalSpent│  │ totalPrice│  │ totalPrice      │
                  │ variants(JSON│   │ ordersCount  │ lineItems │  │ abandonedUrl    │
                  │ images (JSON)│   └───────────┘  └──────────┘  └─────────────────┘
                  └──────────────┘
```

### Key Models

#### User
Represents dashboard users who manage stores.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| email | String | Unique email for login |
| password | String | Bcrypt hashed password |
| name | String | User display name |
| createdAt | DateTime | Account creation timestamp |

#### Tenant (Store)
Each connected Shopify store.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to User |
| shopifyDomain | String | Store's .myshopify.com domain |
| storeName | String | Friendly store name |
| accessToken | String | Shopify Admin API token |
| createdAt | DateTime | Connection timestamp |

#### Product
Cached product catalog from Shopify.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| shopifyId | String | Shopify product ID |
| tenantId | UUID | Foreign key to Tenant |
| title | String | Product name |
| vendor | String | Product vendor/brand |
| variants | JSON | Price, SKU, inventory per variant |
| images | JSON | Product images array |

#### Order
Synced order data with line items.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| shopifyId | String | Shopify order ID |
| tenantId | UUID | Foreign key to Tenant |
| customerId | UUID | Foreign key to Customer (nullable) |
| orderNumber | Integer | Human-readable order number |
| totalPrice | Float | Order total amount |
| currency | String | Currency code (e.g., USD, INR) |
| financialStatus | String | Payment status |
| lineItems | JSON | Ordered products details |

#### Customer
Customer profiles with aggregated metrics.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| shopifyId | String | Shopify customer ID |
| tenantId | UUID | Foreign key to Tenant |
| email | String | Customer email |
| totalSpent | Float | Lifetime value |
| ordersCount | Integer | Total orders placed |

## 🔒 Security Considerations

### Implemented Security Features

1. **Password Hashing**: All user passwords are hashed using bcrypt with salt rounds
2. **JWT Authentication**: Stateless authentication with 7-day token expiration
3. **Multi-Tenancy Isolation**: All database queries are scoped by tenant ID to prevent data leakage
4. **SQL Injection Protection**: Prisma ORM provides parameterized queries
5. **CORS Configuration**: Configured to accept requests from trusted origins

### Production Deployment Recommendations

For production deployments:
- Use environment variables for all sensitive configuration
- Enable HTTPS/TLS for all API communication
- Implement rate limiting on authentication endpoints
- Add API request logging and monitoring
- Consider implementing refresh token rotation
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault) for API tokens
- Enable database connection pooling limits

## 🎯 Design Decisions

### Multi-Tenancy Architecture
The platform uses a **shared database, shared schema** approach where all stores share the same database but data is isolated through `tenantId` foreign keys. This provides:
- Cost efficiency for database hosting
- Simplified backup and maintenance
- Easy cross-store analytics for users with multiple stores

### Sync Strategy
Data synchronization is **triggered on-demand** rather than automated. This design choice:
- Gives users control over when to refresh data
- Reduces unnecessary API calls to Shopify
- Avoids rate limit issues
- Allows for manual reconciliation when needed

### Database Connection Handling
The application uses Neon PostgreSQL with customized connection pooling:
- 30-second connection timeout for serverless environment
- Automatic reconnection handling
- Connection pool optimization for concurrent requests

## 🚀 Future Enhancements

### Planned Features

1. **Automated Sync Scheduling**
   - Background job queue for automated data synchronization
   - Configurable sync intervals per store
   - Webhook integration for real-time updates

2. **Advanced Analytics**
   - Customer cohort analysis
   - Product recommendation engine
   - Predictive revenue forecasting
   - Inventory optimization suggestions

3. **Export Capabilities**
   - CSV/Excel export for all reports
   - PDF dashboard snapshots
   - Scheduled email reports

4. **Team Collaboration**
   - Multi-user access per store
   - Role-based permissions (Admin, Manager, Viewer)
   - Activity audit logs

5. **Enhanced Inventory Management**
   - Reorder point notifications
   - Supplier management integration
   - Inventory transfer tracking

6. **Mobile Application**
   - Native iOS and Android apps
   - Push notifications for critical alerts
   - Offline mode with sync when online

7. **Integration Ecosystem**
   - Slack/Discord notifications
   - Google Analytics integration
   - Email marketing platform connectors
   - QuickBooks/Xero accounting sync

8. **Performance Optimizations**
   - Batch data processing for faster syncs
   - Database query optimization
   - Redis caching layer
   - GraphQL API option

### Environment Variables (Production)

```env
# Backend (.env)
DATABASE_URL="postgresql://..."
JWT_SECRET="<strong-random-secret>"
NODE_ENV="production"
PORT=4123

# Frontend (via build-time)
VITE_API_URL="https://api.yourdomain.com"
```


