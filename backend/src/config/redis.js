import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client
const redisClient = createClient({
    socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        connectTimeout: 1000,
        reconnectStrategy: (retries) => {
            if (retries > 3) {
                return false; // Stop retrying after 3 attempts
            }
            return Math.min(retries * 100, 3000);
        }
    },
    password: process.env.REDIS_PASSWORD || undefined,
});

// Redis event handlers
redisClient.on('connect', () => {
    // console.log('✅ Connected to Redis');
});

redisClient.on('error', (err) => {
    // Completely silent for local connection issues to avoid terminal noise
    if (err.code === 'ECONNREFUSED' && !redisClient.isOpen) {
        return;
    }
    // console.error('❌ Redis error:', err.message);
});

redisClient.on('ready', () => {
    // console.log('✅ Redis client ready');
});

// In-memory fallback cache
const memoryCache = new Map();

// Connect to Redis
const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            // console.log('ℹ️  Redis not found. Using internal memory cache for this session.');
        } else {
            console.error('Failed to connect to Redis:', error.message);
        }
    }
};

// Cache helper functions
export const cacheHelpers = {
    // Get cached data
    get: async (key) => {
        try {
            if (redisClient.isOpen) {
                const data = await redisClient.get(key);
                return data ? JSON.parse(data) : null;
            }
            // Fallback to memory cache
            const item = memoryCache.get(key);
            if (item && item.expiry > Date.now()) {
                return item.value;
            } else if (item) {
                memoryCache.delete(key);
            }
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    },

    // Set cached data with TTL
    set: async (key, value, ttl = parseInt(process.env.CACHE_TTL || '300')) => {
        try {
            if (redisClient.isOpen) {
                await redisClient.setEx(key, ttl, JSON.stringify(value));
            }
            // Always set in memory cache as well for simplicity/speed
            memoryCache.set(key, {
                value,
                expiry: Date.now() + (ttl * 1000)
            });
            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            return false;
        }
    },

    // Delete cached data
    del: async (key) => {
        try {
            if (redisClient.isOpen) {
                await redisClient.del(key);
            }
            memoryCache.delete(key);
            return true;
        } catch (error) {
            console.error('Cache delete error:', error);
            return false;
        }
    },

    // Clear all cache
    flush: async () => {
        try {
            if (redisClient.isOpen) {
                await redisClient.flushAll();
            }
            memoryCache.clear();
            return true;
        } catch (error) {
            console.error('Cache flush error:', error);
            return false;
        }
    },

    // Check if key exists
    exists: async (key) => {
        try {
            if (redisClient.isOpen) {
                const result = await redisClient.exists(key);
                return result === 1;
            }
            const item = memoryCache.get(key);
            return !!(item && item.expiry > Date.now());
        } catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }
};

export { redisClient, connectRedis };
export default redisClient;
