import express from 'express';
import {
    getAllHospitals,
    getHospitalById,
    findNearestAmbulance
} from '../controllers/hospitalController.js';

const router = express.Router();

// Get all hospitals
router.get('/', getAllHospitals);

// Get hospital by ID
router.get('/:id', getHospitalById);

// Find nearest ambulance to a hospital
router.get('/:id/nearest-ambulance', findNearestAmbulance);

export default router;
