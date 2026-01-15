import express from 'express';
import {
    getAllAmbulances,
    getAmbulanceById,
    updateAmbulanceLocation,
    updateAmbulanceStatus,
    simulateMovement,
    createAmbulance,
    updateAmbulance,
    deleteAmbulance,
    alertAmbulance
} from '../controllers/ambulanceController.js';

const router = express.Router();

// Get all ambulances
router.get('/', getAllAmbulances);

// Create ambulance
router.post('/', createAmbulance);

// Get ambulance by ID
router.get('/:id', getAmbulanceById);

// Full update ambulance
router.put('/:id', updateAmbulance);

// Delete ambulance
router.delete('/:id', deleteAmbulance);

// Send urgent alert
router.post('/:id/alert', alertAmbulance);

// Update ambulance location
router.put('/:id/location', updateAmbulanceLocation);

// Update ambulance status
router.put('/:id/status', updateAmbulanceStatus);

// Simulate ambulance movement
router.post('/:id/simulate-movement', simulateMovement);

export default router;
