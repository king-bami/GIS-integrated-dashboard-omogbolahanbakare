import express from 'express';
import {
    getAllAmbulances,
    getAmbulanceById,
    updateAmbulanceLocation,
    updateAmbulanceStatus,
    simulateMovement
} from '../controllers/ambulanceController.js';

const router = express.Router();

// Get all ambulances
router.get('/', getAllAmbulances);

// Get ambulance by ID
router.get('/:id', getAmbulanceById);

// Update ambulance location
router.put('/:id/location', updateAmbulanceLocation);

// Update ambulance status
router.put('/:id/status', updateAmbulanceStatus);

// Simulate ambulance movement
router.post('/:id/simulate-movement', simulateMovement);

export default router;
