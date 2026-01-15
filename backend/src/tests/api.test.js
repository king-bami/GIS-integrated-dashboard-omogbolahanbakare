const request = require('supertest');
const { app, server } = require('../server');
const { pool } = require('../config/database');
const { cacheHelpers } = require('../config/redis');

describe('🚑 Hospital GIS API Integration Tests', () => {

    // Ensure database connection is closed after tests
    afterAll(async () => {
        await pool.end();
        server.close();

        // Close redis/memory connection if needed
        if (cacheHelpers.client && cacheHelpers.client.disconnect) {
            await cacheHelpers.client.disconnect();
        }
    });

    describe('GET /api/hospitals', () => {
        it('should return a list of hospitals', async () => {
            const res = await request(app).get('/api/hospitals');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(Array.isArray(res.body.data)).toBe(true);
        });
    });

    describe('GET /api/ambulances', () => {
        it('should return a list of ambulances', async () => {
            const res = await request(app).get('/api/ambulances');
            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
        });
    });

    describe('⚠️ Validation Logic', () => {
        it('should reject invalid coordinates for updates', async () => {
            // Find a valid ID first (assuming seed data exists, ID 1 usually safe)
            const ambId = 1;
            const res = await request(app).put(`/api/ambulances/${ambId}/location`).send({
                latitude: 199.99, // Invalid Lat
                longitude: 500.00 // Invalid Lng
            });
            expect(res.statusCode).toEqual(400);
        });
    });

});
