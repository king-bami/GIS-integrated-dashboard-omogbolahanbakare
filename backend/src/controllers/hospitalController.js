import { query } from '../config/database.js';
import { cacheHelpers } from '../config/redis.js';

/**
 * Get all hospitals
 */
export const getAllHospitals = async (req, res) => {
    try {
        const cacheKey = 'hospitals:all';

        // Check cache first
        const cachedData = await cacheHelpers.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                cached: true,
                data: cachedData
            });
        }

        // Query database
        const result = await query(`
      SELECT 
        id,
        name,
        address,
        phone,
        capacity,
        specialties,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        created_at,
        updated_at
      FROM hospitals
      ORDER BY name
    `);

        const hospitals = result.rows;

        // Cache the result
        await cacheHelpers.set(cacheKey, hospitals, 600); // Cache for 10 minutes

        res.json({
            success: true,
            cached: false,
            data: hospitals
        });
    } catch (error) {
        console.error('Error fetching hospitals:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hospitals'
        });
    }
};

/**
 * Get a single hospital by ID
 */
export const getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `hospital:${id}`;

        // Check cache
        const cachedData = await cacheHelpers.get(cacheKey);
        if (cachedData) {
            return res.json({
                success: true,
                cached: true,
                data: cachedData
            });
        }

        const result = await query(`
      SELECT 
        id,
        name,
        address,
        phone,
        capacity,
        specialties,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        created_at,
        updated_at
      FROM hospitals
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Hospital not found'
            });
        }

        const hospital = result.rows[0];
        await cacheHelpers.set(cacheKey, hospital, 600);

        res.json({
            success: true,
            cached: false,
            data: hospital
        });
    } catch (error) {
        console.error('Error fetching hospital:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch hospital'
        });
    }
};

/**
 * Find nearest ambulance to a hospital using spatial queries
 */
export const findNearestAmbulance = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `nearest_ambulance:hospital:${id}`;

        // Check cache first - this is the "Grit" challenge feature
        const cachedData = await cacheHelpers.get(cacheKey);
        if (cachedData) {
            console.log(`✅ Cache hit for hospital ${id}`);
            return res.json({
                success: true,
                cached: true,
                data: cachedData
            });
        }

        console.log(`🔍 Cache miss for hospital ${id} - querying database`);

        // Get hospital location
        const hospitalResult = await query(`
      SELECT 
        id,
        name,
        location,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude
      FROM hospitals
      WHERE id = $1
    `, [id]);

        if (hospitalResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Hospital not found'
            });
        }

        const hospital = hospitalResult.rows[0];

        // Find nearest ambulance using PostGIS spatial query
        // ST_Distance returns distance in meters for geography type
        const ambulanceResult = await query(`
      SELECT 
        a.id,
        a.vehicle_number,
        a.status,
        a.driver_name,
        a.phone,
        a.equipment,
        ST_Y(a.location::geometry) as latitude,
        ST_X(a.location::geometry) as longitude,
        ST_Distance(a.location, $1::geography) as distance_meters,
        ROUND(ST_Distance(a.location, $1::geography)::numeric / 1000, 2) as distance_km
      FROM ambulances a
      WHERE a.status = 'available'
      ORDER BY a.location <-> $1::geography
      LIMIT 1
    `, [hospital.location]);

        if (ambulanceResult.rows.length === 0) {
            return res.json({
                success: true,
                cached: false,
                data: {
                    hospital: {
                        id: hospital.id,
                        name: hospital.name,
                        latitude: hospital.latitude,
                        longitude: hospital.longitude
                    },
                    nearestAmbulance: null,
                    message: 'No available ambulances found'
                }
            });
        }

        const nearestAmbulance = ambulanceResult.rows[0];

        // Log the proximity request
        await query(`
      INSERT INTO proximity_requests (hospital_id, nearest_ambulance_id, distance_meters, cached)
      VALUES ($1, $2, $3, $4)
    `, [hospital.id, nearestAmbulance.id, nearestAmbulance.distance_meters, false]);

        const responseData = {
            hospital: {
                id: hospital.id,
                name: hospital.name,
                latitude: hospital.latitude,
                longitude: hospital.longitude
            },
            nearestAmbulance: {
                id: nearestAmbulance.id,
                vehicleNumber: nearestAmbulance.vehicle_number,
                status: nearestAmbulance.status,
                driverName: nearestAmbulance.driver_name,
                phone: nearestAmbulance.phone,
                equipment: nearestAmbulance.equipment,
                latitude: nearestAmbulance.latitude,
                longitude: nearestAmbulance.longitude,
                distanceMeters: parseFloat(nearestAmbulance.distance_meters),
                distanceKm: parseFloat(nearestAmbulance.distance_km)
            }
        };

        // Cache the result for 5 minutes
        await cacheHelpers.set(cacheKey, responseData, 300);

        res.json({
            success: true,
            cached: false,
            data: responseData
        });
    } catch (error) {
        console.error('Error finding nearest ambulance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to find nearest ambulance'
        });
    }
};
