import express from 'express';
import {
    getAllHospitals,
    getHospitalById,
    findNearestAmbulance,
    createHospital,
    updateHospital,
    deleteHospital
} from '../controllers/hospitalController.js';

const router = express.Router();

// Get all hospitals
router.get('/', getAllHospitals);

// Create hospital
router.post('/', createHospital);

// Get hospital by ID
router.get('/:id', getHospitalById);

// Update hospital
router.put('/:id', updateHospital);

// Delete hospital
router.delete('/:id', deleteHospital);

// Find nearest ambulance to a hospital
router.get('/:id/nearest-ambulance', findNearestAmbulance);

export default router;
