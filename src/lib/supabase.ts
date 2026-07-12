import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export type UserRole = 'fleet_manager' | 'driver' | 'safety_officer' | 'financial_analyst';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type VehicleType = 'truck' | 'van' | 'bus' | 'motorcycle' | 'car' | 'other';
export type VehicleStatus = 'available' | 'on_trip' | 'in_shop' | 'retired';

export interface Vehicle {
  id: string;
  registration_number: string;
  name: string;
  type: VehicleType;
  max_load_capacity: number;
  odometer: number;
  acquisition_cost: number;
  status: VehicleStatus;
  region: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DriverStatus = 'available' | 'on_trip' | 'off_duty' | 'suspended';

export interface Driver {
  id: string;
  full_name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  contact_number: string | null;
  safety_score: number;
  status: DriverStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TripStatus = 'draft' | 'dispatched' | 'completed' | 'cancelled';

export interface Trip {
  id: string;
  trip_number: string;
  vehicle_id: string;
  driver_id: string;
  origin: string;
  destination: string;
  cargo_weight: number;
  planned_distance: number;
  actual_distance: number | null;
  status: TripStatus;
  scheduled_at: string | null;
  dispatched_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  start_odometer: number | null;
  end_odometer: number | null;
  fuel_consumed: number | null;
  revenue: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Pick<Vehicle, 'id' | 'registration_number' | 'name' | 'type'>;
  driver?: Pick<Driver, 'id' | 'full_name'>;
}

export type MaintenanceStatus = 'active' | 'closed';

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  maintenance_type: string;
  description: string | null;
  cost: number;
  status: MaintenanceStatus;
  started_at: string;
  closed_at: string | null;
  odometer_at_service: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Pick<Vehicle, 'id' | 'registration_number' | 'name'>;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  trip_id: string | null;
  liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_reading: number | null;
  filled_at: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  vehicle?: Pick<Vehicle, 'id' | 'registration_number' | 'name'>;
}

export type ExpenseCategory = 'toll' | 'repair' | 'insurance' | 'permit' | 'tire' | 'other';

export interface Expense {
  id: string;
  vehicle_id: string | null;
  trip_id: string | null;
  category: ExpenseCategory;
  amount: number;
  description: string | null;
  expense_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  vehicle?: Pick<Vehicle, 'id' | 'registration_number' | 'name'>;
}
