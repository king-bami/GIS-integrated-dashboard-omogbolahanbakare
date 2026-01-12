import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    password: process.env.REDIS_PASSWORD || undefined,
});

// Redis event handlers
redisClient.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redisClient.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

redisClient.on('ready', () => {
    console.log('✅ Redis client ready');
});

// Connect to Redis
const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('Failed to connect to Redis:', error);
        console.log('⚠️  Running without cache. Install and start Redis for caching functionality.');
    }
};

// Cache helper functions
export const cacheHelpers = {
    // Get cached data
    get: async (key) => {
        try {
            if (!redisClient.isOpen) return null;
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    },

    // Set cached data with TTL
    set: async (key, value, ttl = parseInt(process.env.CACHE_TTL || '300')) => {
        try {
            if (!redisClient.isOpen) return false;
            await redisClient.setEx(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    },

    // Delete cached data
    del: async (key) => {
        try {
            if (!redisClient.isOpen) return false;
            await redisClient.del(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    },

    // Clear all cache
    flush: async () => {
        try {
            if (!redisClient.isOpen) return false;
            await redisClient.flushAll();
            return true;
        } catch (error) {
            console.error('Cache flush error:', error);
            return false;
        }
    },

    // Check if key exists
    exists: async (key) => {
        try {
            if (!redisClient.isOpen) return false;
            const result = await redisClient.exists(key);
            return result === 1;
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    },

    // Get cache statistics
    getStats: async () => {
        try {
            if (!redisClient.isOpen) return null;
            const info = await redisClient.info('stats');
            return info;
        } catch (error) {
            console.error('Cache stats error:', error);
            return null;
        }
    }
};

export { redisClient, connectRedis };
export default redisClient;
