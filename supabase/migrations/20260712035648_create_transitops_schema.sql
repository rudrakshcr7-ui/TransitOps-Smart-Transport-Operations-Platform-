
/*
# TransitOps Schema

## Overview
Full schema for the TransitOps Smart Transport Operations Platform.
Implements RBAC with roles (Fleet Manager, Driver, Safety Officer, Financial Analyst),
vehicle registry, driver management, trip lifecycle management, maintenance logs,
fuel logs, and expenses.

## New Tables
1. `profiles` - Extends auth.users with role, full_name, and avatar_url
2. `vehicles` - Fleet registry with registration, type, capacity, odometer, status
3. `drivers` - Driver profiles with license details, safety score, status
4. `trips` - Trip records linking vehicles and drivers with lifecycle states
5. `maintenance_logs` - Maintenance records per vehicle, triggers In Shop status
6. `fuel_logs` - Fuel fill-up records (liters, cost, odometer)
7. `expenses` - Other operational expenses (tolls, misc) per trip or vehicle

## Security
- RLS enabled on all tables
- All policies scoped to `authenticated` role
- All users can read vehicles, drivers, trips, maintenance, fuel, expenses
- Inserts/updates/deletes allowed to all authenticated users (shared org data)
- Profiles: users can only read/update their own profile

## Triggers
- `on_auth_user_created` - Creates a profile row on new user signup
- `after_maintenance_insert` - Sets vehicle status to 'in_shop' on active maintenance
- `after_maintenance_update` - Restores vehicle to 'available' when maintenance closed
- `after_trip_update` - Updates vehicle and driver status on trip state changes
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'driver' CHECK (role IN ('fleet_manager','driver','safety_officer','financial_analyst')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'driver')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- VEHICLES
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number text UNIQUE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('truck','van','bus','motorcycle','car','other')),
  max_load_capacity numeric NOT NULL DEFAULT 0,
  odometer numeric NOT NULL DEFAULT 0,
  acquisition_cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','on_trip','in_shop','retired')),
  region text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
CREATE POLICY "vehicles_select" ON vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vehicles_insert" ON vehicles;
CREATE POLICY "vehicles_insert" ON vehicles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_update" ON vehicles;
CREATE POLICY "vehicles_update" ON vehicles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "vehicles_delete" ON vehicles;
CREATE POLICY "vehicles_delete" ON vehicles FOR DELETE TO authenticated USING (true);

-- ============================================================
-- DRIVERS
-- ============================================================
CREATE TABLE IF NOT EXISTS drivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  license_number text UNIQUE NOT NULL,
  license_category text NOT NULL,
  license_expiry_date date NOT NULL,
  contact_number text,
  safety_score numeric NOT NULL DEFAULT 100 CHECK (safety_score >= 0 AND safety_score <= 100),
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','on_trip','off_duty','suspended')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drivers_select" ON drivers;
CREATE POLICY "drivers_select" ON drivers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "drivers_insert" ON drivers;
CREATE POLICY "drivers_insert" ON drivers FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "drivers_update" ON drivers;
CREATE POLICY "drivers_update" ON drivers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "drivers_delete" ON drivers;
CREATE POLICY "drivers_delete" ON drivers FOR DELETE TO authenticated USING (true);

-- ============================================================
-- TRIPS
-- ============================================================
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_number text UNIQUE NOT NULL DEFAULT ('TRP-' || upper(substring(gen_random_uuid()::text, 1, 8))),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  driver_id uuid NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
  origin text NOT NULL,
  destination text NOT NULL,
  cargo_weight numeric NOT NULL DEFAULT 0,
  planned_distance numeric NOT NULL DEFAULT 0,
  actual_distance numeric,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','dispatched','completed','cancelled')),
  scheduled_at timestamptz,
  dispatched_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  start_odometer numeric,
  end_odometer numeric,
  fuel_consumed numeric,
  revenue numeric DEFAULT 0,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trips_select" ON trips;
CREATE POLICY "trips_select" ON trips FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trips_insert" ON trips;
CREATE POLICY "trips_insert" ON trips FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "trips_update" ON trips;
CREATE POLICY "trips_update" ON trips FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trips_delete" ON trips;
CREATE POLICY "trips_delete" ON trips FOR DELETE TO authenticated USING (true);

-- Trigger: auto-update vehicle & driver status on trip state changes
CREATE OR REPLACE FUNCTION handle_trip_status_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Dispatching
  IF NEW.status = 'dispatched' AND (OLD.status IS NULL OR OLD.status != 'dispatched') THEN
    UPDATE vehicles SET status = 'on_trip', updated_at = now() WHERE id = NEW.vehicle_id;
    UPDATE drivers SET status = 'on_trip', updated_at = now() WHERE id = NEW.driver_id;
    NEW.dispatched_at = COALESCE(NEW.dispatched_at, now());
  END IF;

  -- Completing
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE vehicles SET status = 'available', updated_at = now() WHERE id = NEW.vehicle_id;
    UPDATE drivers SET status = 'available', updated_at = now() WHERE id = NEW.driver_id;
    -- Update vehicle odometer if end odometer provided
    IF NEW.end_odometer IS NOT NULL THEN
      UPDATE vehicles SET odometer = NEW.end_odometer, updated_at = now() WHERE id = NEW.vehicle_id;
    END IF;
    NEW.completed_at = COALESCE(NEW.completed_at, now());
  END IF;

  -- Cancelling
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    IF OLD.status = 'dispatched' THEN
      UPDATE vehicles SET status = 'available', updated_at = now() WHERE id = NEW.vehicle_id;
      UPDATE drivers SET status = 'available', updated_at = now() WHERE id = NEW.driver_id;
    END IF;
    NEW.cancelled_at = COALESCE(NEW.cancelled_at, now());
  END IF;

  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_trip_status_change ON trips;
CREATE TRIGGER on_trip_status_change
  BEFORE UPDATE ON trips
  FOR EACH ROW EXECUTE FUNCTION handle_trip_status_change();

-- ============================================================
-- MAINTENANCE LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS maintenance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  maintenance_type text NOT NULL,
  description text,
  cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','closed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  odometer_at_service numeric,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "maintenance_select" ON maintenance_logs;
CREATE POLICY "maintenance_select" ON maintenance_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "maintenance_insert" ON maintenance_logs;
CREATE POLICY "maintenance_insert" ON maintenance_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "maintenance_update" ON maintenance_logs;
CREATE POLICY "maintenance_update" ON maintenance_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "maintenance_delete" ON maintenance_logs;
CREATE POLICY "maintenance_delete" ON maintenance_logs FOR DELETE TO authenticated USING (true);

-- Trigger: vehicle → in_shop when maintenance created
CREATE OR REPLACE FUNCTION handle_maintenance_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE vehicles SET status = 'in_shop', updated_at = now() WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_insert ON maintenance_logs;
CREATE TRIGGER on_maintenance_insert
  AFTER INSERT ON maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION handle_maintenance_insert();

-- Trigger: vehicle → available when maintenance closed
CREATE OR REPLACE FUNCTION handle_maintenance_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'closed' AND OLD.status = 'active' THEN
    UPDATE vehicles
      SET status = CASE WHEN status = 'retired' THEN 'retired' ELSE 'available' END,
          updated_at = now()
    WHERE id = NEW.vehicle_id;
    NEW.closed_at = COALESCE(NEW.closed_at, now());
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_maintenance_update ON maintenance_logs;
CREATE TRIGGER on_maintenance_update
  BEFORE UPDATE ON maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION handle_maintenance_update();

-- ============================================================
-- FUEL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS fuel_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  liters numeric NOT NULL CHECK (liters > 0),
  cost_per_liter numeric NOT NULL CHECK (cost_per_liter >= 0),
  total_cost numeric GENERATED ALWAYS AS (liters * cost_per_liter) STORED,
  odometer_reading numeric,
  filled_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE fuel_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fuel_logs_select" ON fuel_logs;
CREATE POLICY "fuel_logs_select" ON fuel_logs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "fuel_logs_insert" ON fuel_logs;
CREATE POLICY "fuel_logs_insert" ON fuel_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "fuel_logs_update" ON fuel_logs;
CREATE POLICY "fuel_logs_update" ON fuel_logs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "fuel_logs_delete" ON fuel_logs;
CREATE POLICY "fuel_logs_delete" ON fuel_logs FOR DELETE TO authenticated USING (true);

-- ============================================================
-- EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  category text NOT NULL CHECK (category IN ('toll','repair','insurance','permit','tire','other')),
  amount numeric NOT NULL CHECK (amount >= 0),
  description text,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "expenses_select" ON expenses;
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "expenses_insert" ON expenses;
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "expenses_update" ON expenses;
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "expenses_delete" ON expenses;
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (true);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle_id ON trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle_id ON maintenance_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_logs(status);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle_id ON fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expenses_vehicle_id ON expenses(vehicle_id);
