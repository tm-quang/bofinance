/**
 * Vehicle Management Module - Barrel Exports
 * ==========================================
 * 
 * This file provides convenient exports for all vehicle management components.
 * 
 * Usage:
 * -----
 * Instead of:
 *   import VehicleManagement from './pages/vehicles/index'
 *   import AddVehicle from './pages/vehicles/AddVehicle'
 * 
 * You can use:
 *   import { VehicleManagement, AddVehicle } from './pages/vehicles/exports'
 */

// Re-export all vehicle page components
export { default as VehicleManagement } from './index'
export { default as AddVehicle } from './AddVehicle'
export { default as VehicleTrips } from './VehicleTrips'

// Export types from service
export type {
    VehicleRecord,
    TripRecord,
    FuelLogRecord,
    MaintenanceRecord,
    ExpenseRecord,
    VehicleStats,
    VehicleAlert,
} from '../../lib/vehicles/vehicleService'

// Export service functions (optional - for direct use)
export {
    fetchVehicles,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    fetchTrips,
    createTrip,
    updateTrip,
    deleteTrip,
    getVehicleStats,
    getVehicleAlerts,
} from '../../lib/vehicles/vehicleService'
