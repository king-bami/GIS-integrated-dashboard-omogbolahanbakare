import pool from '../config/database.js';

/**
 * Seed the database with mock hospitals and ambulances
 */
async function seedData() {
    const client = await pool.connect();

    try {
        console.log('🌱 Starting database seeding...');

        // Clear existing data
        await client.query('DELETE FROM proximity_requests');
        await client.query('DELETE FROM ambulances');
        await client.query('DELETE FROM hospitals');
        console.log('✅ Cleared existing data');

        // Mock hospitals data (10 hospitals in Lagos, Nigeria area)
        const hospitals = [
            {
                name: 'Lagos University Teaching Hospital',
                address: 'Idi-Araba, Mushin, Lagos',
                phone: '+234-1-8093544',
                capacity: 750,
                specialties: ['Emergency', 'Surgery', 'Cardiology', 'Pediatrics'],
                lat: 6.5095,
                lng: 3.3711
            },
            {
                name: 'General Hospital Lagos',
                address: 'Lagos Island, Lagos',
                phone: '+234-1-2636061',
                capacity: 500,
                specialties: ['Emergency', 'General Medicine', 'Obstetrics'],
                lat: 6.4541,
                lng: 3.3947
            },
            {
                name: 'Reddington Hospital',
                address: '12 Idowu Martins Street, Victoria Island',
                phone: '+234-1-4617090',
                capacity: 200,
                specialties: ['Emergency', 'Surgery', 'Diagnostics', 'Cardiology'],
                lat: 6.4281,
                lng: 3.4219
            },
            {
                name: 'Eko Hospital',
                address: '31 Mobolaji Bank Anthony Way, Ikeja',
                phone: '+234-1-4488500',
                capacity: 300,
                specialties: ['Emergency', 'Orthopedics', 'Neurology', 'ICU'],
                lat: 6.6018,
                lng: 3.3515
            },
            {
                name: 'St. Nicholas Hospital',
                address: '57 Campbell Street, Lagos Island',
                phone: '+234-1-2690520',
                capacity: 150,
                specialties: ['Emergency', 'Maternity', 'Pediatrics'],
                lat: 6.4474,
                lng: 3.3903
            },
            {
                name: 'Lagoon Hospital',
                address: 'Apapa-Oshodi Expressway, Ajegunle',
                phone: '+234-1-2718713',
                capacity: 180,
                specialties: ['Emergency', 'Surgery', 'Radiology'],
                lat: 6.4698,
                lng: 3.3528
            },
            {
                name: 'First Cardiology Consultants Hospital',
                address: '10 Biaduo Street, S.W. Ikoyi',
                phone: '+234-1-2693416',
                capacity: 120,
                specialties: ['Cardiology', 'Emergency', 'ICU'],
                lat: 6.4698,
                lng: 3.4343
            },
            {
                name: 'Gbagada General Hospital',
                address: 'Gbagada Expressway, Gbagada',
                phone: '+234-1-7744958',
                capacity: 400,
                specialties: ['Emergency', 'General Medicine', 'Surgery', 'Obstetrics'],
                lat: 6.5447,
                lng: 3.3915
            },
            {
                name: 'Havana Specialist Hospital',
                address: '8 Oba Akinjobi Street, Ikeja GRA',
                phone: '+234-1-7746458',
                capacity: 250,
                specialties: ['Emergency', 'Orthopedics', 'Neurosurgery', 'Radiology'],
                lat: 6.5964,
                lng: 3.3515
            },
            {
                name: 'Gold Cross Hospital',
                address: '1 Oduduwa Crescent, Ikeja GRA',
                phone: '+234-1-4979346',
                capacity: 180,
                specialties: ['Emergency', 'General Medicine', 'Diagnostics'],
                lat: 6.5833,
                lng: 3.3515
            }
        ];

        // Insert hospitals
        for (const hospital of hospitals) {
            await client.query(`
        INSERT INTO hospitals (name, address, phone, capacity, specialties, location)
        VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
      `, [
                hospital.name,
                hospital.address,
                hospital.phone,
                hospital.capacity,
                hospital.specialties,
                hospital.lng,
                hospital.lat
            ]);
        }
        console.log('✅ Inserted 10 hospitals');

        // Mock ambulances data (5 ambulances)
        const ambulances = [
            {
                vehicle_number: 'AMB-001-LG',
                status: 'available',
                driver_name: 'Adebayo Ogunleye',
                phone: '+234-803-555-0101',
                equipment: ['Defibrillator', 'Oxygen', 'Stretcher', 'First Aid Kit'],
                lat: 6.5244,
                lng: 3.3792
            },
            {
                vehicle_number: 'AMB-002-LG',
                status: 'available',
                driver_name: 'Chioma Nwosu',
                phone: '+234-803-555-0102',
                equipment: ['Defibrillator', 'Oxygen', 'Stretcher', 'First Aid Kit', 'Ventilator'],
                lat: 6.4698,
                lng: 3.4343
            },
            {
                vehicle_number: 'AMB-003-LG',
                status: 'on-call',
                driver_name: 'Ibrahim Mohammed',
                phone: '+234-803-555-0103',
                equipment: ['Defibrillator', 'Oxygen', 'Stretcher', 'First Aid Kit'],
                lat: 6.6018,
                lng: 3.3515
            },
            {
                vehicle_number: 'AMB-004-LG',
                status: 'available',
                driver_name: 'Funke Adeyemi',
                phone: '+234-803-555-0104',
                equipment: ['Defibrillator', 'Oxygen', 'Stretcher', 'First Aid Kit', 'ECG Monitor'],
                lat: 6.4541,
                lng: 3.3947
            },
            {
                vehicle_number: 'AMB-005-LG',
                status: 'available',
                driver_name: 'Emeka Okafor',
                phone: '+234-803-555-0105',
                equipment: ['Defibrillator', 'Oxygen', 'Stretcher', 'First Aid Kit', 'Ventilator', 'ECG Monitor'],
                lat: 6.5447,
                lng: 3.3915
            }
        ];

        // Insert ambulances
        for (const ambulance of ambulances) {
            await client.query(`
        INSERT INTO ambulances (vehicle_number, status, driver_name, phone, equipment, location)
        VALUES ($1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326)::geography)
      `, [
                ambulance.vehicle_number,
                ambulance.status,
                ambulance.driver_name,
                ambulance.phone,
                ambulance.equipment,
                ambulance.lng,
                ambulance.lat
            ]);
        }
        console.log('✅ Inserted 5 ambulances');

        console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run seeding
seedData()
    .then(() => {
        console.log('Database seeding complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Database seeding failed:', error);
        process.exit(1);
    });
