import pool from '../config/database.js';

/**
 * Initialize the database with PostGIS extension and create necessary tables
 */
async function initDatabase() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting database initialization...');

        // Enable PostGIS extension
        await client.query(`
      CREATE EXTENSION IF NOT EXISTS postgis;
    `);
        console.log('✅ PostGIS extension enabled');

        // Create hospitals table
        await client.query(`
      CREATE TABLE IF NOT EXISTS hospitals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        phone VARCHAR(50),
        capacity INTEGER,
        specialties TEXT[],
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Hospitals table created');

        // Create spatial index on hospitals
        await client.query(`
      CREATE INDEX IF NOT EXISTS hospitals_location_idx 
      ON hospitals USING GIST(location);
    `);
        console.log('✅ Spatial index created on hospitals');

        // Create ambulances table
        await client.query(`
      CREATE TABLE IF NOT EXISTS ambulances (
        id SERIAL PRIMARY KEY,
        vehicle_number VARCHAR(50) NOT NULL UNIQUE,
        status VARCHAR(20) DEFAULT 'available',
        driver_name VARCHAR(255),
        phone VARCHAR(50),
        equipment TEXT[],
        location GEOGRAPHY(POINT, 4326) NOT NULL,
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Ambulances table created');

        // Create spatial index on ambulances
        await client.query(`
      CREATE INDEX IF NOT EXISTS ambulances_location_idx 
      ON ambulances USING GIST(location);
    `);
        console.log('✅ Spatial index created on ambulances');

        // Create proximity_requests table for tracking requests
        await client.query(`
      CREATE TABLE IF NOT EXISTS proximity_requests (
        id SERIAL PRIMARY KEY,
        hospital_id INTEGER REFERENCES hospitals(id),
        nearest_ambulance_id INTEGER REFERENCES ambulances(id),
        distance_meters NUMERIC(10, 2),
        request_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        cached BOOLEAN DEFAULT FALSE
      );
    `);
        console.log('✅ Proximity requests table created');

        // Create function to update updated_at timestamp
        await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

        // Create trigger for hospitals
        await client.query(`
      DROP TRIGGER IF EXISTS update_hospitals_updated_at ON hospitals;
      CREATE TRIGGER update_hospitals_updated_at
        BEFORE UPDATE ON hospitals
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
        console.log('✅ Triggers created');

        console.log('🎉 Database initialization completed successfully!');
    } catch (error) {
        console.error('❌ Error initializing database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run initialization
initDatabase()
    .then(() => {
        console.log('Database setup complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Database setup failed:', error);
        process.exit(1);
    });
