# TransitOps — Smart Transport Operations Platform

A full-stack fleet management web application for transport operators. Track vehicles, drivers, trips, maintenance, fuel, and expenses — with real-time analytics and ROI reporting.

## Features

### Fleet Management
- **Vehicles** — Registry with registration numbers, types (truck, van, bus, car, motorcycle), load capacity, odometer readings, acquisition cost, and live status (available, on trip, in shop, retired).
- **Drivers** — Driver profiles with license number, license category, expiry date, contact info, safety score (0–100), and status (available, on trip, off duty, suspended).

### Operations
- **Trips** — Full trip lifecycle: draft → dispatched → completed / cancelled. Links vehicles and drivers, tracks planned vs. actual distance, cargo weight, odometer readings, fuel consumed, and revenue. Trip status changes automatically update vehicle and driver statuses via database triggers.
- **Maintenance** — Log maintenance with type, description, cost, and odometer at service. Active maintenance automatically sets the vehicle to "in shop"; closing it restores the vehicle to "available."

### Cost Tracking
- **Fuel Logs** — Record fill-ups with liters, cost per liter (auto-calculated total), odometer reading, date, and notes. Summary cards show total cost, total liters, and average cost per liter.
- **Expenses** — Categorized operational expenses (toll, repair, insurance, permit, tire, other) with optional vehicle association and per-vehicle cost breakdown.

### Analytics & Reporting
- **Dashboard** — Fleet overview with key metrics and recent activity.
- **Reports** — Date-range filtered analytics with:
  - KPI cards (fleet utilization, total revenue, total operational cost, fuel cost)
  - 7-day cost trend line chart (fuel, maintenance, expenses)
  - Fuel efficiency bar chart per vehicle (km/L)
  - Per-vehicle ROI table with cost breakdown and profit margin
  - CSV export for offline analysis

### Authentication
- Email/password authentication via Supabase Auth
- Auto-creates a user profile on signup with role-based access control (fleet manager, driver, safety officer, financial analyst)
- Protected routes — unauthenticated users are redirected to login

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Routing | React Router v7 |
| Charts | Recharts |
| Icons | Lucide React |
| Date handling | date-fns |
| Backend & Database | Supabase (PostgreSQL, Auth, RLS) |

## Architecture

```
src/
├── App.tsx                 # Root component with routing & auth guard
├── main.tsx                # Entry point
├── index.css               # Global styles & Tailwind directives
├── context/
│   └── AuthContext.tsx     # Supabase auth session provider
├── lib/
│   └── supabase.ts         # Supabase client & TypeScript types
├── components/
│   ├── AppLayout.tsx       # Sidebar navigation + topbar shell
│   ├── Modal.tsx           # Modal & confirmation dialog primitives
│   └── ui.tsx              # Reusable UI components (Button, Input, Select, Badge, etc.)
├── pages/
│   ├── HomePage.tsx        # Landing page
│   ├── LoginPage.tsx       # Auth login
│   ├── DashboardPage.tsx   # Fleet overview
│   ├── VehiclesPage.tsx    # Vehicle CRUD
│   ├── DriversPage.tsx     # Driver CRUD
│   ├── TripsPage.tsx       # Trip lifecycle management
│   ├── MaintenancePage.tsx # Maintenance logs
│   ├── FuelPage.tsx        # Fuel logs
│   ├── ExpensesPage.tsx    # Expense tracking
│   └── ReportsPage.tsx     # Analytics & CSV export
└── supabase/
    └── migrations/
        └── 20260712035648_create_transitops_schema.sql  # Full database schema
```

## Database Schema

The application uses 7 PostgreSQL tables with Row Level Security (RLS) enabled on all of them:

| Table | Purpose |
|-------|---------|
| `profiles` | Extends `auth.users` with role and full name |
| `vehicles` | Fleet registry with status lifecycle |
| `drivers` | Driver profiles with license & safety tracking |
| `trips` | Trip records linking vehicles and drivers |
| `maintenance_logs` | Maintenance records with auto vehicle status triggers |
| `fuel_logs` | Fuel entries with auto-calculated total cost |
| `expenses` | Categorized operational expenses |

### Database Triggers

- **`on_auth_user_created`** — Auto-creates a profile row when a new user signs up.
- **`on_maintenance_insert`** — Sets the vehicle status to `in_shop` when active maintenance is logged.
- **`on_maintenance_update`** — Restores the vehicle to `available` when maintenance is closed.
- **`on_trip_status_change`** — Updates vehicle and driver statuses when a trip is dispatched, completed, or cancelled. Also updates the vehicle odometer on trip completion.

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/transitops.git
cd transitops

# Install dependencies
npm install
```

### Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

The migration file is located at `supabase/migrations/20260712035648_create_transitops_schema.sql`. Run this in your Supabase SQL Editor to create all tables, policies, triggers, and indexes.

### Run the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
```

The optimized build will be in the `dist/` directory.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## License

This project is open source and available under the MIT License.
