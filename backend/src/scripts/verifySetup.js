import pool from '../config/database.js';
import { redisClient, connectRedis } from '../config/redis.js';

async function verifySetup() {
    console.log('🔍 Verifying Hospital Dashboard Setup...\n');

    let allGood = true;

    // Check PostgreSQL connection
    try {
        const result = await pool.query('SELECT version()');
        console.log('✅ PostgreSQL connected');
        console.log(`   Version: ${result.rows[0].version.split(' ')[1]}`);
    } catch (error) {
        console.log('❌ PostgreSQL connection failed');
        console.log(`   Error: ${error.message}`);
        allGood = false;
    }

    // Check PostGIS extension
    try {
        const result = await pool.query('SELECT PostGIS_version()');
        console.log('✅ PostGIS extension enabled');
        console.log(`   Version: ${result.rows[0].postgis_version}`);
    } catch (error) {
        console.log('❌ PostGIS extension not found');
        console.log(`   Error: ${error.message}`);
        allGood = false;
    }

    // Check if tables exist
    try {
        const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('hospitals', 'ambulances', 'proximity_requests')
      ORDER BY table_name
    `);

        if (result.rows.length === 3) {
            console.log('✅ All database tables created');
            result.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        } else {
            console.log('❌ Some tables are missing');
            console.log('   Run: npm run init-db');
            allGood = false;
        }
    } catch (error) {
        console.log('❌ Error checking tables');
        console.log(`   Error: ${error.message}`);
        allGood = false;
    }

    // Check if data is seeded
    try {
        const hospitalsResult = await pool.query('SELECT COUNT(*) FROM hospitals');
        const ambulancesResult = await pool.query('SELECT COUNT(*) FROM ambulances');

        const hospitalCount = parseInt(hospitalsResult.rows[0].count);
        const ambulanceCount = parseInt(ambulancesResult.rows[0].count);

        if (hospitalCount >= 10 && ambulanceCount >= 5) {
            console.log('✅ Database seeded with data');
            console.log(`   Hospitals: ${hospitalCount}`);
            console.log(`   Ambulances: ${ambulanceCount}`);
        } else {
            console.log('⚠️  Database needs seeding');
            console.log(`   Hospitals: ${hospitalCount} (expected: 10)`);
            console.log(`   Ambulances: ${ambulanceCount} (expected: 5)`);
            console.log('   Run: npm run seed');
            allGood = false;
        }
    } catch (error) {
        console.log('❌ Error checking data');
        console.log(`   Error: ${error.message}`);
        allGood = false;
    }

    // Check Redis connection
    try {
        await connectRedis();
        if (redisClient.isOpen) {
            console.log('✅ Redis connected');
            const info = await redisClient.info('server');
            const version = info.match(/redis_version:([^\r\n]+)/)?.[1];
            if (version) {
                console.log(`   Version: ${version}`);
            }
        } else {
            console.log('⚠️  Redis not connected (optional)');
            console.log('   App will work without caching');
        }
    } catch (error) {
        console.log('⚠️  Redis connection failed (optional)');
        console.log('   App will work without caching');
    }

    // Check spatial indexes
    try {
        const result = await pool.query(`
      SELECT tablename, indexname 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND indexname LIKE '%location_idx%'
    `);

        if (result.rows.length >= 2) {
            console.log('✅ Spatial indexes created');
            result.rows.forEach(row => {
                console.log(`   - ${row.indexname} on ${row.tablename}`);
            });
        } else {
            console.log('⚠️  Some spatial indexes missing');
            allGood = false;
        }
    } catch (error) {
        console.log('❌ Error checking indexes');
        console.log(`   Error: ${error.message}`);
    }

    console.log('\n' + '='.repeat(50));

    if (allGood) {
        console.log('🎉 Setup verification complete! All systems ready.');
        console.log('\nYou can now run:');
        console.log('  npm run dev (in backend directory)');
        console.log('  npm run dev (in frontend directory)');
    } else {
        console.log('⚠️  Setup incomplete. Please address the issues above.');
    }

    console.log('='.repeat(50) + '\n');

    await pool.end();
    if (redisClient.isOpen) {
        await redisClient.quit();
    }
    process.exit(allGood ? 0 : 1);
}

verifySetup();
