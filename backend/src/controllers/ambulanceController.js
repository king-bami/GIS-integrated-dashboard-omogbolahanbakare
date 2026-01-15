import { query } from '../config/database.js';
import { cacheHelpers } from '../config/redis.js';
import { emitAmbulanceUpdate, emitStatusUpdate, emitUnitAlert } from '../config/socket.js';

/**
 * Get all ambulances
 */
export const getAllAmbulances = async (req, res) => {
    try {
        const cacheKey = 'ambulances:all';

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
        vehicle_number,
        status,
        driver_name,
        phone,
        equipment,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        last_updated,
        created_at
      FROM ambulances
      ORDER BY vehicle_number
    `);

        const ambulances = result.rows;
        await cacheHelpers.set(cacheKey, ambulances, 60); // Cache for 1 minute (shorter due to location updates)

        res.json({
            success: true,
            cached: false,
            data: ambulances
        });
    } catch (error) {
        console.error('Error fetching ambulances:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ambulances'
        });
    }
};

/**
 * Get a single ambulance by ID
 */
export const getAmbulanceById = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(`
      SELECT 
        id,
        vehicle_number,
        status,
        driver_name,
        phone,
        equipment,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        last_updated,
        created_at
      FROM ambulances
      WHERE id = $1
    `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ambulance not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching ambulance:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch ambulance'
        });
    }
};

/**
 * Update ambulance location (simulates movement)
 */
export const updateAmbulanceLocation = async (req, res) => {
    try {
        const { id } = req.params;
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        // Validate coordinates
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            return res.status(400).json({
                success: false,
                error: 'Invalid coordinates'
            });
        }

        const result = await query(`
      UPDATE ambulances
      SET 
        location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING 
        id,
        vehicle_number,
        status,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        last_updated
    `, [longitude, latitude, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ambulance not found'
            });
        }

        // Invalidate relevant caches
        await cacheHelpers.del('ambulances:all');
        // Also invalidate all proximity caches since ambulance moved
        await cacheHelpers.flush();

        // Emit live update via socket
        emitAmbulanceUpdate(result.rows[0]);

        res.json({
            success: true,
            message: 'Ambulance location updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating ambulance location:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ambulance location'
        });
    }
};

/**
 * Update ambulance status
 */
export const updateAmbulanceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const validStatuses = ['available', 'on-call', 'off-duty', 'maintenance', 'busy'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        const result = await query(`
      UPDATE ambulances
      SET 
        status = $1,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING 
        id,
        vehicle_number,
        status,
        last_updated
    `, [status, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ambulance not found'
            });
        }

        // Invalidate caches
        await cacheHelpers.del('ambulances:all');
        await cacheHelpers.flush(); // Clear proximity caches

        // Emit status update via socket
        emitStatusUpdate(result.rows[0]);

        res.json({
            success: true,
            message: 'Ambulance status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating ambulance status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update ambulance status'
        });
    }
};

/**
 * Simulate ambulance movement (for demo purposes)
 */
export const simulateMovement = async (req, res) => {
    try {
        const { id } = req.params;

        // Get current location
        const currentResult = await query(`
      SELECT 
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude
      FROM ambulances
      WHERE id = $1
    `, [id]);

        if (currentResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Ambulance not found'
            });
        }

        const current = currentResult.rows[0];

        // Generate small random movement (approximately 100-500 meters)
        const latOffset = (Math.random() - 0.5) * 0.005; // ~0.5km max
        const lngOffset = (Math.random() - 0.5) * 0.005;

        const newLat = parseFloat(current.latitude) + latOffset;
        const newLng = parseFloat(current.longitude) + lngOffset;

        // Update location
        const result = await query(`
      UPDATE ambulances
      SET 
        location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING 
        id,
        vehicle_number,
        ST_Y(location::geometry) as latitude,
        ST_X(location::geometry) as longitude,
        last_updated
    `, [newLng, newLat, id]);

        // Invalidate caches
        await cacheHelpers.del('ambulances:all');
        await cacheHelpers.flush();

        // Emit live update via socket
        emitAmbulanceUpdate(result.rows[0]);

        res.json({
            success: true,
            message: 'Ambulance moved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error simulating movement:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to simulate movement'
        });
    }
};

/**
 * Create a new ambulance
 */
export const createAmbulance = async (req, res) => {
    try {
        const { vehicle_number, driver_name, phone, status, equipment, latitude, longitude } = req.body;

        const result = await query(`
      INSERT INTO ambulances (vehicle_number, driver_name, phone, status, equipment, location)
      VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
      RETURNING *, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
    `, [vehicle_number, driver_name, phone, status || 'available', equipment, longitude, latitude]);

        await cacheHelpers.del('ambulances:all');
        await cacheHelpers.flush(); // Real-time updates might affect proximity

        // Broadcast new ambulance
        emitAmbulanceUpdate(result.rows[0]);

        res.status(201).json({
            success: true,
            message: 'Ambulance created successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating ambulance:', error);
        res.status(500).json({ success: false, error: 'Failed to create ambulance' });
    }
};

/**
 * Update an ambulance (full update)
 */
export const updateAmbulance = async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicle_number, driver_name, phone, status, equipment, latitude, longitude } = req.body;

        const result = await query(`
      UPDATE ambulances
      SET 
        vehicle_number = COALESCE($1, vehicle_number),
        driver_name = COALESCE($2, driver_name),
        phone = COALESCE($3, phone),
        status = COALESCE($4, status),
        equipment = COALESCE($5, equipment),
        location = CASE 
          WHEN $6::float IS NOT NULL AND $7::float IS NOT NULL 
          THEN ST_SetSRID(ST_MakePoint($7, $6), 4326)::geography 
          ELSE location 
        END,
        last_updated = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude
    `, [vehicle_number, driver_name, phone, status, equipment, latitude, longitude, id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ambulance not found' });
        }

        await cacheHelpers.del('ambulances:all');
        await cacheHelpers.flush();

        // Broadcast update
        emitAmbulanceUpdate(result.rows[0]);

        res.json({
            success: true,
            message: 'Ambulance updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating ambulance:', error);
        res.status(500).json({ success: false, error: 'Failed to update ambulance' });
    }
};

/**
 * Delete an ambulance
 */
export const deleteAmbulance = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM ambulances WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ambulance not found' });
        }

        await cacheHelpers.del('ambulances:all');
        await cacheHelpers.flush();

        res.json({
            success: true,
            message: 'Ambulance deleted successfully',
            id: id
        });
    } catch (error) {
        console.error('Error deleting ambulance:', error);
        res.status(500).json({ success: false, error: 'Failed to delete ambulance' });
    }
};

/**
 * Send an urgent alert to an ambulance unit
 */
export const alertAmbulance = async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        const result = await query('SELECT id, vehicle_number FROM ambulances WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Ambulance not found' });
        }

        const ambulance = result.rows[0];

        // Broadcast pulse-alert via socket
        emitUnitAlert({
            id: ambulance.id,
            vehicleNumber: ambulance.vehicle_number,
            message: message || 'URGENT DISPATCH ALERT RECEIVED',
            timestamp: new Date().toISOString()
        });

        res.json({
            success: true,
            message: `Urgent alert broadcasted to Unit ${ambulance.vehicle_number}`
        });
    } catch (error) {
        console.error('Error sending alert:', error);
        res.status(500).json({ success: false, error: 'Failed to send alert' });
    }
};
