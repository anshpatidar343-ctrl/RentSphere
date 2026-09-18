# RentSphere – Rental Management System

A full-stack web application designed for property owners and landlords to streamline property management, track tenant occupancy, monitor monthly rental billing, record payments, and securely store tenant documentation.

---

## 1. Project Overview

Managing multiple rental campuses, rooms, tenants, rent dues, and proof-of-identity documents across disparate spreadsheets or manual notebooks is error-prone, inefficient, and insecure.

**RentSphere** solves this by establishing a hierarchical rental management workflow:
$$\text{Campus} \longrightarrow \text{Room} \longrightarrow \text{Tenant} \longrightarrow \text{Rent Bill} \longrightarrow \text{Payments / Documents}$$

Property owners get a single, responsive dashboard to:
- Organize multi-campus properties and rooms.
- Monitor occupancy and vacancy at a glance.
- Generate and manage monthly rent bills with custom due dates.
- Log partial and full tenant payments in real time.
- Securely upload, view, and manage tenant lease agreements and identification files.
- Ensure 100% data privacy through strict owner-level data isolation.

---

## 2. Main Features

### 🏢 Property Hierarchy Management
- **Campuses**: Create, list, edit, and delete property campuses. Automatic calculation of total rooms, occupied rooms, and available rooms.
- **Rooms**: Add rooms under a campus with monthly rent and security deposit amounts. Automatic occupancy status updates (`Available` vs. `Occupied`).
- **All Rooms Directory (`/rooms`)**: A cross-campus room catalog with live keyword searching (by room number, campus, or tenant) and status filtering (`All`, `Available`, `Occupied`).

### 👤 Tenant Management
- **Tenant Assignment**: Assign tenants to rooms with full name, contact phone, email, and joining date.
- **Auto Status Sync**: Assigning a tenant marks the room as `Occupied`; removing the tenant automatically reverts the room to `Available`.
- **All Tenants Directory (`/tenants`)**: Cross-property tenant directory with live search filtering and direct one-click navigation to the tenant's room and payment ledger.

### 💰 Billing & Payment Tracking
- **Monthly Rent Bills**: Auto-generation of the current month's bill or manual generation of custom month bills with due dates.
- **Payment History Ledger**: Complete audit trail per room listing billing month, payment date, rent amount, amount paid, remaining due, and status badge (`Paid` vs. `Due`).
- **Flexible Payments**: Record partial or full payments specifying payment method (`UPI`, `Cash`, `Bank Transfer`, `Cheque`), transaction dates, and custom notes. Live recalculation of remaining balances.

### 📁 Tenant Document Storage
- **Identity & Lease Files**: Upload identity proofs (Aadhar, PAN, Passport) and signed rental contracts directly to each tenant profile.
- **Secure File Storage**: Files are processed using `multer` with timestamps and stored in a protected uploads directory.
- **File Retrieval & Removal**: Direct in-browser viewing, downloading, and deletion with confirmation checks.

### 🛡️ User Experience & Confirmations
- **In-App Confirmation Dialogs**: Destructive actions (deleting campuses, rooms, tenants, or documents) are guarded with an in-app confirmation modal with customizable severity (`danger`, `warning`, `info`) to eliminate accidental data loss.
- **Responsive Layout**: Fluid experience across desktop, tablet, and mobile with sticky navigation and accessible typography.

---

## 3. Tech Stack

### Frontend
- **React 19**: Modern component architecture utilizing functional components and React Hooks (`useState`, `useEffect`, `useParams`, `useNavigate`).
- **Vite**: Ultra-fast development server and module bundler.
- **React Router v7 (`react-router-dom`)**: Client-side routing with route guards (`ProtectedRoute`, `PublicRoute`).
- **Vanilla CSS**: Curated design system using CSS custom properties (variables), flexible grids, and responsive media queries.

### Backend
- **Node.js**: Asynchronous JavaScript runtime.
- **Express 5**: RESTful API framework routing requests and enforcing middleware.
- **MySQL2**: Connection pooling and parameterized SQL queries preventing SQL injection.
- **Multer**: Multipart form-data middleware handling secure tenant document uploads.

### Authentication & Security
- **JSON Web Tokens (`jsonwebtoken`)**: Stateless authentication with encrypted user payloads transmitted via Bearer headers.
- **Bcrypt (`bcrypt`)**: Cryptographic salting and hashing for owner passwords.
- **Dotenv**: Environment variable isolation.

---

## 4. Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                   React 19 Frontend                     │
│  (Vite + React Router v7 + Vanilla CSS Design Tokens)  │
└───────────────────────────┬─────────────────────────────┘
                            │
               RESTful HTTP Requests (JSON)
           Authorization: Bearer <JWT_TOKEN>
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                  Express REST API                       │
│    ├── authMiddleware (JWT Verification & Owner Auth)   │
│    ├── Controllers (Campuses, Rooms, Tenants, Rent)     │
│    └── Multer Middleware (Document File Uploads)        │
└───────────────────────────┬─────────────────────────────┘
                            │
                 Parameterized SQL Queries
                     (mysql2 pool)
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     MySQL Database                      │
│        Tables: owners, campuses, rooms, tenants,        │
│                rent, payments, documents                │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Database Structure

The database schema (`backend/database/schema.sql`) enforces relational integrity through foreign keys:

```text
owners (id, name, email, password)
  │
  └──< campuses (id, owner_id, name)
         │
         └──< rooms (id, campus_id, room_number, monthly_rent, security_deposit, status)
                │
                ├──< tenants (id, room_id, name, phone, email, joining_date)
                │      │
                │      └──< documents (id, tenant_id, document_name, file_path, upload_date)
                │
                └──< rent (id, room_id, month, due_date, rent_amount)
                       │
                       └──< payments (id, rent_id, amount, payment_date, payment_method, note)
```

### Table Breakdown

| Table | Primary Key | Foreign Keys | Description |
|---|---|---|---|
| `owners` | `id` | None | Property owners registered on the platform. |
| `campuses` | `id` | `owner_id → owners(id)` (`ON DELETE CASCADE`) | Campuses or properties owned by an owner. |
| `rooms` | `id` | `campus_id → campuses(id)` (`ON DELETE CASCADE`) | Individual rental units/rooms under a campus. |
| `tenants` | `id` | `room_id → rooms(id)` (`ON DELETE SET NULL`) | Tenants assigned to rooms. |
| `rent` | `id` | `room_id → rooms(id)` (`ON DELETE CASCADE`) | Monthly billing records per room. |
| `payments` | `id` | `rent_id → rent(id)` (`ON DELETE CASCADE`) | Partial or full payments applied against rent bills. |
| `documents` | `id` | `tenant_id → tenants(id)` (`ON DELETE CASCADE`) | Uploaded tenant IDs, contracts, and lease files. |

---

## 6. Authentication & JWT Flow

1. **Owner Registration (`POST /api/auth/signup`)**:
   - Owner submits name, email, and password.
   - Backend checks for duplicate emails.
   - Password is salted and hashed with `bcrypt` (10 rounds) before insertion.
   - Signs and returns a JWT token containing `{ id: owner.id, name: owner.name }`.

2. **Owner Login (`POST /api/auth/login`)**:
   - Owner submits email and password.
   - Backend retrieves user record and compares password hash via `bcrypt.compare`.
   - On match, generates a signed JWT token valid for 24 hours.

3. **Client-side Session**:
   - Token and owner object are stored in browser `localStorage`.
   - `ProtectedRoute.jsx` checks for the token before rendering protected dashboard views.
   - `api.js` automatically injects `Authorization: Bearer <token>` into the headers of every HTTP request.

4. **API Middleware (`authMiddleware.js`)**:
   - Extracts and verifies the Bearer token using `jwt.verify(token, JWT_SECRET)`.
   - Populates `req.owner = decoded`, making `req.owner.id` available to all controllers.

---

## 7. Owner Data Isolation

RentSphere strictly enforces data privacy. Owners cannot view, edit, or delete data belonging to other owners:

1. **Top-Level Isolation**: Campuses query strictly filters by `owner_id`:
   ```sql
   SELECT * FROM campuses WHERE owner_id = ?
   ```
2. **Deep Relational Validation**: When querying, updating, or deleting lower-hierarchy entities (rooms, tenants, rent, payments, documents), the backend traverses the relationship chain back to `campuses.owner_id`:
   ```sql
   SELECT r.id FROM rooms r
   JOIN campuses c ON r.campus_id = c.id
   WHERE r.id = ? AND c.owner_id = ?
   ```
3. If an authenticated user attempts to access an entity belonging to another owner, the database query returns 0 rows and the controller responds with `403 Forbidden` or `404 Not Found`.

---

## 8. Prerequisites & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- [MySQL Server](https://dev.mysql.com/downloads/) (version 8.0 or higher) or MariaDB
- `npm` (Node Package Manager, installed with Node.js)

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/RentSphere.git
   cd RentSphere
   ```

2. **Set up the MySQL Database**:
   - Open your MySQL command-line client or GUI (MySQL Workbench / phpMyAdmin).
   - Execute the schema initialization script located at:
     ```bash
     mysql -u your_username -p < backend/database/schema.sql
     ```
   - This creates the database `rentsphere` and all 7 tables with foreign keys.

3. **Install Backend Dependencies**:
   ```bash
   cd backend
   npm install
   ```

4. **Install Frontend Dependencies**:
   ```bash
   cd ../frontend
   npm install
   ```

---

## 9. Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Port
PORT=8080

# Database Configuration
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_NAME=rentsphere

# JSON Web Token Secret
JWT_SECRET=your_secure_random_jwt_secret_key
```

> **Security Note:** Never commit `.env` files containing real production passwords or secret keys to version control.

---

## 10. Running the Project

### 1. Start the Backend API Server
```bash
cd backend
node app.js
```
*The backend starts at `http://localhost:8080` and connects to MySQL.*

### 2. Start the Frontend Development Server
In a separate terminal:
```bash
cd frontend
npm run dev
```
*Vite starts the React frontend at `http://localhost:5173` (or available port).*

Open `http://localhost:5173` in your browser, sign up for a new owner account, and start managing your properties.

---

## 11. Project Screenshots

*(Add project screenshots in this section for visual demonstration)*

### 1. Owner Dashboard & Campus Overview
<!-- Replace with actual screenshot path, e.g., ![Dashboard](screenshots/dashboard.png) -->
> *Overview of all property campuses with real-time occupancy statistics and quick campus creation.*

### 2. Campus Room Management
<!-- Replace with actual screenshot path, e.g., ![Campus Overview](screenshots/campus.png) -->
> *Room grid displaying room numbers, monthly rent, security deposits, and occupancy status badges.*

### 3. Room Details, Billing & Payment History
<!-- Replace with actual screenshot path, e.g., ![Room Details](screenshots/room_details.png) -->
> *Room management interface displaying tenant details, current month billing, partial payment logs, and lease documents.*

### 4. Cross-Campus Unified Directories
<!-- Replace with actual screenshot path, e.g., ![Tenants Directory](screenshots/tenants.png) -->
> *Unified directory showing all rooms and all active tenants across properties with search and status filters.*

---

## 12. Future Improvements

Planned future roadmap items (to be implemented in upcoming releases):
- **Payment Receipts & WhatsApp Sharing**: Instant PDF payment receipt generation and manual one-click WhatsApp sharing pre-filled with transaction summaries.
- **Financial Analytics & Export**: Monthly revenue graphs, pending dues aggregators, and Excel/CSV export of payment history.
- **SMS / Email Rent Reminders**: Automated notification alerts sent to tenants when monthly rent due dates approach.
- **Maintenance Request Tracking**: A dedicated ticketing portal for tenants to report room repair and maintenance issues.

---

## 13. License

This project is developed for educational and portfolio demonstration purposes. All rights reserved.
