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
            // console.log(`✅ [CACHE HIT] Proximity check for Hospital ${id} served from cache (60s TTL).`);
            return res.json({
                success: true,
                cached: true,
                data: cachedData
            });
        }

        // console.log(`🔍 Cache miss for hospital ${id} - querying database`);

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

        // Find nearest ambulances using PostGIS spatial query
        // We now fetch up to 5 to allow the admin to choose
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
      WHERE a.status IN ('available', 'busy')
      ORDER BY a.location <-> $1::geography
      LIMIT 5
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
                    nearbyAmbulances: [],
                    message: 'No available ambulances found'
                }
            });
        }

        const nearbyAmbulances = ambulanceResult.rows.map(amb => ({
            id: amb.id,
            vehicleNumber: amb.vehicle_number,
            status: amb.status,
            driverName: amb.driver_name,
            phone: amb.phone,
            equipment: amb.equipment,
            latitude: amb.latitude,
            longitude: amb.longitude,
            distanceMeters: parseFloat(amb.distance_meters),
            distanceKm: parseFloat(amb.distance_km),
            // ETA Calculation: Distance / speed (assuming 40km/h for Lagos traffic)
            // Time in minutes = (Distance in KM / 40) * 60
            etaMinutes: Math.ceil((parseFloat(amb.distance_km) / 40) * 60)
        }));

        const nearestAmbulance = nearbyAmbulances[0];

        // Log the proximity request because it hit the database
        await query(`
      INSERT INTO proximity_requests (hospital_id, nearest_ambulance_id, distance_meters, cached)
      VALUES ($1, $2, $3, $4)
    `, [hospital.id, nearestAmbulance.id, nearestAmbulance.distanceMeters, false]);

        const responseData = {
            hospital: {
                id: hospital.id,
                name: hospital.name,
                latitude: hospital.latitude,
                longitude: hospital.longitude
            },
            nearestAmbulance,
            nearbyAmbulances
        };

        // Cache the result for 60 seconds
        await cacheHelpers.set(cacheKey, responseData, 60);

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

/**
 * Create a new hospital
 */
export const createHospital = async (req, res) => {
    try {
        const { name, address, phone, capacity, specialties, latitude, longitude } = req.body;

        const result = await query(`
      INSERT INTO hospitals (name, address, phone, capacity, specialties, location)
      VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
      RETURNING *, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
    `, [name, address, phone, capacity, specialties, longitude, latitude]);

        await cacheHelpers.del('hospitals:all');

        res.status(201).json({
            success: true,
            message: 'Hospital created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating hospital:', error);
        res.status(500).json({ success: false, error: 'Failed to create hospital' });
    }
};

/**
 * Update an existing hospital
 */
export const updateHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, phone, capacity, specialties, latitude, longitude } = req.body;

        const result = await query(`
      UPDATE hospitals
      SET 
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        phone = COALESCE($3, phone),
        capacity = COALESCE($4, capacity),
        specialties = COALESCE($5, specialties),
        location = CASE 
          WHEN $6::float IS NOT NULL AND $7::float IS NOT NULL 
          THEN ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography 
          ELSE location 
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
    `, [name, address, phone, capacity, specialties, latitude, longitude, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }

        await cacheHelpers.del('hospitals:all');
        await cacheHelpers.del(`hospital:${id}`);
        await cacheHelpers.flush(); // Flush proximity caches as location might have changed

        res.json({
            success: true,
            message: 'Hospital updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating hospital:', error);
        res.status(500).json({ success: false, error: 'Failed to update hospital' });
    }
};

/**
 * Delete a hospital
 */
export const deleteHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM hospitals WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Hospital not found' });
        }

        await cacheHelpers.del('hospitals:all');
        await cacheHelpers.del(`hospital:${id}`);
        await cacheHelpers.flush();

        res.json({
            success: true,
            message: 'Hospital deleted successfully',
            id: id
        });
    } catch (error) {
        console.error('Error deleting hospital:', error);
        res.status(500).json({ success: false, error: 'Failed to delete hospital' });
    }
};
