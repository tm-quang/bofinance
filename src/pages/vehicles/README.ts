/**
 * VEHICLE MANAGEMENT MODULE
 * =========================
 * 
 * This folder contains all pages and components for the Vehicle Management feature.
 * 
 * Structure:
 * ---------
 * /pages/vehicles/
 *   ├── index.tsx            - Main dashboard (VehicleManagement)
 *   ├── AddVehicle.tsx       - Form to add/edit vehicles
 *   ├── VehicleTrips.tsx     - Trip management
 *   ├── VehicleFuel.tsx      - (Coming soon) Fuel logs
 *   ├── VehicleMaintenance.tsx - (Coming soon) Maintenance records
 *   ├── VehicleExpenses.tsx  - (Coming soon) Other expenses
 *   └── VehicleReports.tsx   - (Coming soon) Analytics & reports
 * 
 * /lib/vehicles/
 *   ├── vehicleService.ts    - All CRUD operations and business logic
 *   ├── vehicleSchema.ts     - Database schema (SQL)
 *   └── vehicleInfo.ts       - Module information and constants
 * 
 * Routes:
 * ------
 * /vehicles              - Dashboard (index.tsx)
 * /vehicles/add          - Add/Edit vehicle (AddVehicle.tsx)
 * /vehicles/trips        - Trips management (VehicleTrips.tsx)
 * /vehicles/fuel         - Fuel logs (VehicleFuel.tsx) - Coming soon
 * /vehicles/maintenance  - Maintenance (VehicleMaintenance.tsx) - Coming soon
 * /vehicles/expenses     - Expenses (VehicleExpenses.tsx) - Coming soon
 * /vehicles/reports      - Reports (VehicleReports.tsx) - Coming soon
 * 
 * Features:
 * --------
 * ✅ Multi-vehicle support
 * ✅ Vehicle info management (license plate, model, brand, year, odometer, etc.)
 * ✅ Trip logging with automatic distance calculation
 * ✅ Smart alerts for inspection, insurance, and maintenance
 * ✅ Real-time statistics (distance, fuel consumption, cost per km)
 * ✅ Monthly expense tracking
 * ⏳ Fuel/charging logs
 * ⏳ Maintenance history with reminders
 * ⏳ Expense tracking (tolls, parking, insurance, etc.)
 * ⏳ Analytics and reports
 * 
 * Database Tables:
 * ---------------
 * - vehicles             - Vehicle information
 * - vehicle_trips        - Trip logs
 * - vehicle_fuel_logs    - Fuel/charging records
 * - vehicle_maintenance  - Maintenance history
 * - vehicle_expenses     - Other expenses
 * 
 * Services API:
 * ------------
 * See src/lib/vehicles/vehicleService.ts for full API documentation
 * 
 * Key Functions:
 * - fetchVehicles(), createVehicle(), updateVehicle(), deleteVehicle()
 * - fetchTrips(), createTrip(), updateTrip(), deleteTrip()
 * - getVehicleStats(vehicleId) - Get analytics
 * - getVehicleAlerts(vehicleId) - Get upcoming alerts
 * 
 * Implementation Pattern:
 * ----------------------
 * Each module page follows this structure:
 * 1. State management (vehicles, selected vehicle, data list, loading states)
 * 2. Load functions (vehicles, module data)
 * 3. CRUD handlers (add, edit, delete)
 * 4. UI rendering (header, selector, stats, list, modals)
 * 5. Modal components (Add/Edit modal, Delete confirmation)
 * 
 * To add a new module:
 * -------------------
 * 1. Copy VehicleTrips.tsx as template
 * 2. Update the data model and service calls
 * 3. Customize the form fields in the modal
 * 4. Add the route to App.tsx
 * 5. Add navigation button in index.tsx
 * 
 * Dependencies:
 * ------------
 * - lucide-react: Icons
 * - react-router-dom: Navigation
 * - Supabase: Database
 * 
 * Notes:
 * -----
 * - All imports use relative paths from this folder (../../)
 * - Services are centralized in src/lib/vehicles/
 * - Database schema is in vehicleSchema.ts (run in Supabase SQL Editor)
 * - RLS policies ensure users only see their own data
 */

export const VEHICLE_MODULE_INFO = {
    folder: 'src/pages/vehicles',
    servicesFolder: 'src/lib/vehicles',
    implementedPages: ['index', 'AddVehicle', 'VehicleTrips'],
    pendingPages: ['VehicleFuel', 'VehicleMaintenance', 'VehicleExpenses', 'VehicleReports'],
}
