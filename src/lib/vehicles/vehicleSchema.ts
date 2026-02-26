/**
 * VEHICLE MANAGEMENT SYSTEM - DATABASE SCHEMA
 * ==============================================
 * 
 * Hướng dẫn: Copy toàn bộ nội dung SQL dưới đây và chạy trong Supabase SQL Editor
 * 
 * Hệ thống quản lý xe cá nhân gồm 5 bảng chính:
 * 1. vehicles - Thông tin xe
 * 2. vehicle_trips - Hành trình
 * 3. vehicle_fuel_logs - Nhiên liệu & năng lượng
 * 4. vehicle_maintenance - B ảo trì & bảo dưỡng
 * 5. vehicle_expenses - Chi phí khác
 */

export const VEHICLE_SCHEMA_SQL = `
-- ==============================================================
-- 1. Bảng thông tin xe (Vehicle Info)
-- ==============================================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  license_plate VARCHAR(50) NOT NULL,
  model VARCHAR(200) NOT NULL,
  brand VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  current_odometer INTEGER NOT NULL DEFAULT 0,
  fuel_type VARCHAR(20) NOT NULL DEFAULT 'petrol',
  insurance_expiry_date DATE,
  inspection_expiry_date DATE,
  next_maintenance_km INTEGER,
  next_maintenance_date DATE,
  maintenance_interval_km INTEGER,
  maintenance_interval_months INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_license_plate UNIQUE(user_id, license_plate)
);

-- ==============================================================
-- 2. Bảng hành trình (Trips)
-- ==============================================================
CREATE TABLE IF NOT EXISTS vehicle_trips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  trip_date DATE NOT NULL,
  trip_time TIME,
  trip_type VARCHAR(50) NOT NULL,
  start_km INTEGER NOT NULL,
  end_km INTEGER NOT NULL,
  distance_km INTEGER GENERATED ALWAYS AS (end_km - start_km) STORED,
  start_location VARCHAR(300),
  end_location VARCHAR(300),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_km_range CHECK (end_km >= start_km)
);

-- ==============================================================
-- 3. Bảng nhiên liệu (Fuel Logs)
-- ==============================================================
CREATE TABLE IF NOT EXISTS vehicle_fuel_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  refuel_date DATE NOT NULL,
  refuel_time TIME,
  odometer_at_refuel INTEGER NOT NULL,
  fuel_type VARCHAR(50) NOT NULL,
  liters DECIMAL(10, 2),
  price_per_liter DECIMAL(10, 2),
  kwh DECIMAL(10, 2),
  charge_duration_minutes INTEGER,
  battery_start_percent INTEGER,
  battery_end_percent INTEGER,
  total_amount DECIMAL(15, 2) NOT NULL,
  station_name VARCHAR(300),
  location VARCHAR(300),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- 4. Bảng bảo trì (Maintenance)
-- ==============================================================
CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  maintenance_date DATE NOT NULL,
  odometer INTEGER NOT NULL,
  maintenance_type VARCHAR(50) NOT NULL,
  service_items TEXT[] NOT NULL,
  description TEXT,
  service_provider VARCHAR(200),
  parts_cost DECIMAL(15, 2) DEFAULT 0,
  labor_cost DECIMAL(15, 2) DEFAULT 0,
  total_cost DECIMAL(15, 2) DEFAULT 0,
  invoice_images TEXT[],
  next_reminder_km INTEGER,
  next_reminder_date DATE,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- 5. Bảng chi phí khác (Expenses)
-- ==============================================================
CREATE TABLE IF NOT EXISTS vehicle_expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  expense_date DATE NOT NULL,
  expense_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  description TEXT,
  location VARCHAR(300),
  receipt_images TEXT[],
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================
-- INDEXES
-- ==============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_user_id ON vehicles(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_active ON vehicles(is_active);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_vehicle_id ON vehicle_trips(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_user_id ON vehicle_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_trips_trip_date ON vehicle_trips(trip_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_logs_vehicle_id ON vehicle_fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_logs_user_id ON vehicle_fuel_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_fuel_logs_refuel_date ON vehicle_fuel_logs(refuel_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_vehicle_id ON vehicle_maintenance(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_user_id ON vehicle_maintenance(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_maintenance_date ON vehicle_maintenance(maintenance_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_vehicle_id ON vehicle_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_user_id ON vehicle_expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_expenses_date ON vehicle_expenses(expense_date DESC);

-- ==============================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own vehicles" ON vehicles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own trips" ON vehicle_trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own fuel logs" ON vehicle_fuel_logs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own maintenance" ON vehicle_maintenance FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own expenses" ON vehicle_expenses FOR ALL USING (auth.uid() = user_id);

-- ==============================================================
-- TRIGGERS
-- ==============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_trips_updated_at BEFORE UPDATE ON vehicle_trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_fuel_logs_updated_at BEFORE UPDATE ON vehicle_fuel_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_maintenance_updated_at BEFORE UPDATE ON vehicle_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicle_expenses_updated_at BEFORE UPDATE ON vehicle_expenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;
